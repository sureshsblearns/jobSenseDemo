"""Candidate profile: details, interests, manual skills and completeness."""
from ..config.settings import INTEREST_OPTIONS
from ..ml.skill_extraction.taxonomy import SKILL_INDEX, canonical_skill, normalize_skill_key, skill_category
from ..models import career_model, match_model, resume_model, user_model
from ..utils.responses import APIError, NotFound, ValidationError
from ..utils.serialization import load_json_list, row_to_dict
from ..utils.validation import clean_str

REMOTE_OPTIONS = ("any", "remote", "hybrid", "onsite")


def skills_payload(user_id):
    return [{**row_to_dict(s), "category": skill_category(s["skill_name"])}
            for s in resume_model.list_skills(user_id)]


def completeness(user, profile, interests, resume, skill_count):
    """Education/experience count as complete when entered manually OR detected in the resume."""
    resume = resume or {}
    checks = [
        ("Name", bool(user.get("name"))),
        ("Resume uploaded", bool(resume)),
        ("Skills identified", skill_count > 0),
        ("Experience", profile.get("experience_years") is not None or bool(profile.get("experience_summary"))
         or resume.get("experience_years") is not None),
        ("Education", bool(profile.get("education")) or bool(load_json_list(resume.get("education")))),
        ("Location", bool(profile.get("location"))),
        ("Preferred locations", bool(profile.get("preferred_locations"))),
        ("Interests", len(interests) > 0),
    ]
    done = sum(1 for _, ok in checks if ok)
    return {
        "percent": round(done / len(checks) * 100),
        "checks": [{"label": label, "done": ok} for label, ok in checks],
    }


def get_profile(user):
    user_id = user["user_id"]
    profile = row_to_dict(user_model.get_profile(user_id)) or {}
    interests = user_model.get_interests(user_id)
    skills = skills_payload(user_id)
    active = resume_model.get_active_resume(user_id)
    profile.pop("user_id", None)
    return {
        "user": {k: row_to_dict(user)[k] for k in ("user_id", "name", "email", "role", "created_at")},
        "profile": profile,
        "interests": interests,
        "skills": skills,
        "has_resume": active is not None,
        "completeness": completeness(user, profile, interests, active, len(skills)),
        "options": {"interests": INTEREST_OPTIONS, "remote_preferences": list(REMOTE_OPTIONS)},
    }


def update_profile(user, data):
    user_id = user["user_id"]
    if "name" in data:
        name = clean_str(data.get("name"), 120, "name", required=True)
        if len(name) < 2:
            raise ValidationError("Name must be at least 2 characters", {"name": "too_short"})
        user_model.update_name(user_id, name)
    # "role" and "email" are deliberately ignored: they are not editable through the profile.

    fields = {}
    for key, max_len in (("headline", 160), ("location", 120), ("preferred_locations", 500)):
        if key in data:
            fields[key] = clean_str(data.get(key), max_len, key) or None
    for key in ("experience_summary", "education"):
        if key in data:
            fields[key] = clean_str(data.get(key), 4000, key) or None
    if "experience_years" in data:
        raw = data.get("experience_years")
        if raw in (None, ""):
            fields["experience_years"] = None
        else:
            try:
                years = float(raw)
            except (TypeError, ValueError):
                raise ValidationError("Experience must be a number of years", {"experience_years": "invalid"})
            if not 0 <= years <= 60:
                raise ValidationError("Experience must be between 0 and 60 years", {"experience_years": "range"})
            fields["experience_years"] = round(years, 1)
    if "remote_preference" in data:
        pref = str(data.get("remote_preference") or "any").lower()
        if pref not in REMOTE_OPTIONS:
            raise ValidationError("Invalid remote preference", {"remote_preference": "invalid"})
        fields["remote_preference"] = pref
    user_model.update_profile(user_id, fields)

    if "interests" in data:
        interests = data.get("interests") or []
        if not isinstance(interests, list):
            raise ValidationError("Interests must be a list")
        invalid = [i for i in interests if i not in INTEREST_OPTIONS]
        if invalid:
            raise ValidationError("Unknown interest(s): " + ", ".join(map(str, invalid[:5])))
        user_model.set_interests(user_id, list(dict.fromkeys(interests)))
        # Interests influence career recommendations -> recompute lazily.
        career_model.clear_recommendations(user_id)

    return get_profile(user_model.get_by_id(user_id))


def add_skill(user_id, skill_name):
    raw = clean_str(skill_name, 80, "skill", required=True)
    name = canonical_skill(raw)
    if normalize_skill_key(name) not in SKILL_INDEX and len(name) < 2:
        raise ValidationError("Please enter a valid skill name")
    if not resume_model.add_manual_skill(user_id, name):
        raise APIError(f"'{name}' is already in your skills", "DUPLICATE_SKILL", 409)
    match_model.clear_user_matches(user_id)
    return skills_payload(user_id)


def remove_skill(user_id, skill_id):
    if not resume_model.delete_skill(user_id, skill_id):
        raise NotFound("Skill not found")
    match_model.clear_user_matches(user_id)
    return skills_payload(user_id)
