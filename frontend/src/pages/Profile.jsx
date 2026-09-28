import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Plus, X } from 'lucide-react';
import { profileApi } from '../services/api';
import { useAsync, useDocumentTitle } from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Alert, ErrorState, Meter, PageHeader, Skeleton, Spinner } from '../components/ui';

const REMOTE_LABELS = { any: 'No preference', remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' };

export default function Profile() {
  useDocumentTitle('Profile');
  const [params] = useSearchParams();
  const toast = useToast();
  const { updateUser } = useAuth();
  const { data, loading, error, reload, setData } = useAsync(() => profileApi.get(), []);
  const taxonomy = useAsync(() => profileApi.taxonomy(), []);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [skillBusy, setSkillBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm({
      name: data.user.name,
      headline: data.profile.headline || '',
      experience_years: data.profile.experience_years ?? '',
      experience_summary: data.profile.experience_summary || '',
      education: data.profile.education || '',
      location: data.profile.location || '',
      preferred_locations: data.profile.preferred_locations || '',
      remote_preference: data.profile.remote_preference || 'any',
      interests: data.interests,
    });
  }, [data]);

  if (loading && !data) return <Skeleton count={3} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!form) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggleInterest = (i) => setForm((f) => ({
    ...f, interests: f.interests.includes(i) ? f.interests.filter((x) => x !== i) : [...f.interests, i],
  }));

  const save = async (e) => {
    e.preventDefault();
    const v = {};
    if (form.name.trim().length < 2) v.name = 'Please enter your name';
    if (form.experience_years !== '' && (Number.isNaN(Number(form.experience_years)) || Number(form.experience_years) < 0 || Number(form.experience_years) > 60)) {
      v.experience_years = 'Enter a number between 0 and 60';
    }
    setErrors(v);
    if (Object.keys(v).length) return;
    setSaving(true);
    try {
      const updated = await profileApi.update({ ...form, experience_years: form.experience_years === '' ? null : Number(form.experience_years) });
      setData(updated);
      updateUser({ name: updated.user.name });
      toast.success('Profile saved');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addSkill = async (e) => {
    e.preventDefault();
    if (!newSkill.trim()) return;
    setSkillBusy(true);
    try {
      const res = await profileApi.addSkill(newSkill.trim());
      setData((d) => ({ ...d, skills: res.items }));
      setNewSkill('');
      toast.success('Skill added - matches will be recalculated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSkillBusy(false);
    }
  };

  const removeSkill = async (skill) => {
    try {
      const res = await profileApi.removeSkill(skill.skill_id);
      setData((d) => ({ ...d, skills: res.items }));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const allSkills = taxonomy.data?.categories.flatMap((c) => c.skills) || [];

  return (
    <div>
      <PageHeader title="Profile" description="Details used for career recommendations and job searches." />
      {params.get('welcome') && (
        <div style={{ marginBottom: '1rem' }}>
          <Alert type="success" icon={CheckCircle2}>
            Welcome to JobSense! Complete your profile below, then <Link to="/resume">upload your resume</Link> to get personalised matches.
          </Alert>
        </div>
      )}

      <div className="split-2-1">
        <form className="card" onSubmit={save} noValidate aria-labelledby="details-title">
          <h2 id="details-title">Your details</h2>
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" className="input" value={form.name} onChange={set('name')} aria-invalid={Boolean(errors.name)} maxLength={120} />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" className="input" value={data.user.email} disabled readOnly />
              <span className="hint">Email and role cannot be changed here.</span>
            </div>
            <div className="field">
              <label htmlFor="headline">Headline</label>
              <input id="headline" className="input" placeholder="e.g. Frontend developer" value={form.headline} onChange={set('headline')} maxLength={160} />
            </div>
            <div className="field">
              <label htmlFor="exp">Experience (years)</label>
              <input id="exp" className="input" inputMode="decimal" value={form.experience_years} onChange={set('experience_years')}
                aria-invalid={Boolean(errors.experience_years)} />
              {errors.experience_years && <span className="field-error">{errors.experience_years}</span>}
            </div>
          </div>
          <div className="field">
            <label htmlFor="expsum">Experience summary</label>
            <textarea id="expsum" className="textarea" value={form.experience_summary} onChange={set('experience_summary')} maxLength={4000} />
          </div>
          <div className="field">
            <label htmlFor="edu">Education</label>
            <textarea id="edu" className="textarea" style={{ minHeight: 70 }} placeholder="e.g. B.Tech Computer Science, Anna University (2022)" value={form.education} onChange={set('education')} maxLength={4000} />
          </div>
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="loc">Current location</label>
              <input id="loc" className="input" placeholder="e.g. Chennai" value={form.location} onChange={set('location')} maxLength={120} />
            </div>
            <div className="field">
              <label htmlFor="ploc">Preferred locations</label>
              <input id="ploc" className="input" placeholder="e.g. Bengaluru, Hyderabad" value={form.preferred_locations} onChange={set('preferred_locations')} maxLength={500} />
              <span className="hint">Comma separated. Used when fetching jobs for your profile.</span>
            </div>
          </div>
          <div className="field">
            <label htmlFor="remote">Remote preference</label>
            <select id="remote" className="select" value={form.remote_preference} onChange={set('remote_preference')}>
              {data.options.remote_preferences.map((r) => <option key={r} value={r}>{REMOTE_LABELS[r]}</option>)}
            </select>
          </div>
          <fieldset className="field" style={{ border: 0, padding: 0 }}>
            <legend className="label" style={{ marginBottom: 6 }}>Interests</legend>
            <div className="toggle-group">
              {data.options.interests.map((i) => (
                <button key={i} type="button" className="toggle-chip" aria-pressed={form.interests.includes(i)} onClick={() => toggleInterest(i)}>
                  {form.interests.includes(i) && <span aria-hidden="true">✓</span>}{i}
                </button>
              ))}
            </div>
            <span className="hint">A secondary signal for career recommendations - your skills always carry more weight.</span>
          </fieldset>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving && <Spinner />} Save profile</button>
        </form>

        <div className="stack">
          <section className="card" aria-labelledby="complete-title">
            <h2 id="complete-title">Profile completeness</h2>
            <p className="small muted">{data.completeness.percent}% complete</p>
            <Meter value={data.completeness.percent} label="Profile completeness" />
          </section>

          <section className="card" aria-labelledby="skills-title">
            <h2 id="skills-title">Skills</h2>
            <p className="small muted">Skills from your resume, plus any you add manually.</p>
            <ul className="chips list-plain" aria-label="Your skills">
              {data.skills.map((s) => (
                <li key={s.skill_id} className={`chip ${s.source === 'manual' ? 'chip-highlight' : ''}`}>
                  {s.skill_name}
                  <button type="button" onClick={() => removeSkill(s)} aria-label={`Remove ${s.skill_name}`}><X size={13} /></button>
                </li>
              ))}
              {data.skills.length === 0 && <li className="small muted">No skills yet.</li>}
            </ul>
            <form onSubmit={addSkill} className="row" style={{ marginTop: 12, flexWrap: 'nowrap' }}>
              <label htmlFor="new-skill" className="sr-only">Add a skill</label>
              <input id="new-skill" className="input" list="skill-options" placeholder="Add a skill" value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)} maxLength={80} />
              <datalist id="skill-options">{allSkills.map((s) => <option key={s} value={s} />)}</datalist>
              <button type="submit" className="btn btn-secondary" disabled={skillBusy} aria-label="Add skill"><Plus size={16} /></button>
            </form>
            {!data.has_resume && <p className="small" style={{ marginTop: 10 }}><Link to="/resume">Upload a resume</Link> to extract skills automatically.</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
