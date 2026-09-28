import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Sparkles } from 'lucide-react';
import { matchesApi } from '../services/api';
import { useAsync, useDocumentTitle } from '../hooks/useAsync';
import { useSaveJob } from '../hooks/useSaveJob';
import { useToast } from '../context/ToastContext';
import JobCard from '../components/JobCard';
import { EmptyState, ErrorState, PageHeader, Pagination, Skeleton, Spinner } from '../components/ui';

const LIMIT = 10;

export default function Matches() {
  useDocumentTitle('My Matches');
  const toast = useToast();
  const [sort, setSort] = useState('score');
  const [offset, setOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { data, loading, error, reload, setData } = useAsync(
    () => matchesApi.list({ sort, limit: LIMIT, offset }), [sort, offset]);

  const onSaved = useCallback((jobId, saved) => setData((d) => ({
    ...d, items: d.items.map((j) => (j.job_id === jobId ? { ...j, is_saved: saved } : j)),
  })), [setData]);
  const { toggle, pending } = useSaveJob(onSaved);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const { data: r, message } = await matchesApi.refresh(true);
      r.fetch_error ? toast.error(message) : toast.success(`${message}${r.fetched_jobs ? ` · ${r.fetched_jobs} jobs fetched for your profile` : ''}`);
      setOffset(0);
      await reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div>
      <PageHeader title="My Matches" description="Jobs ranked by how closely they align with your resume. Scores are explainable, not guarantees."
        actions={(
          <>
            <label className="sr-only" htmlFor="sort">Sort matches</label>
            <select id="sort" className="select" style={{ width: 'auto' }} value={sort} onChange={(e) => { setSort(e.target.value); setOffset(0); }}>
              <option value="score">Highest match score</option>
              <option value="newest">Newest</option>
            </select>
            <button type="button" className="btn btn-primary" onClick={refresh} disabled={refreshing}>
              {refreshing ? <Spinner /> : <RefreshCw size={16} aria-hidden="true" />} Refresh recommendations
            </button>
          </>
        )} />

      {loading && !data ? <Skeleton count={4} lines={4} /> : error ? <ErrorState error={error} onRetry={reload} /> : !data.profile_ready ? (
        <EmptyState icon={Sparkles} title="Upload your resume to get matches"
          action={<Link className="btn btn-primary" to="/resume">Upload resume</Link>}>
          JobSense needs your skills and resume text to calculate match scores.
        </EmptyState>
      ) : data.items.length === 0 ? (
        <EmptyState icon={Sparkles} title="No matches yet"
          action={<button type="button" className="btn btn-primary" onClick={refresh} disabled={refreshing}>Find jobs for my profile</button>}>
          Search for jobs, or let JobSense fetch jobs based on your top skills and career alignment.
        </EmptyState>
      ) : (
        <>
          <p className="small muted">{data.total} scored jobs</p>
          <div className="stack">
            {data.items.map((job) => <JobCard key={job.job_id} job={job} onToggleSave={toggle} saving={pending === job.job_id} showSnippet={false} />)}
          </div>
          <Pagination offset={offset} limit={LIMIT} total={data.total} onChange={(o) => { setOffset(o); window.scrollTo(0, 0); }} />
        </>
      )}
    </div>
  );
}
