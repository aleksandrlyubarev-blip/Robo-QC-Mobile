import { Link, useNavigate } from "react-router-dom";
import { useSpecs, useDeleteSpec } from "../api/hooks";
import { Loader, ErrorBanner, EmptyState } from "../components/states";
import { formatRelative } from "../lib/format";

export function SpecsPage() {
  const navigate = useNavigate();
  const specs = useSpecs();
  const del = useDeleteSpec();

  if (specs.isLoading) return <Loader />;
  if (specs.error) return <ErrorBanner error={specs.error} />;

  const list = specs.data ?? [];

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 16 }}>
        <h1 className="page-title" style={{ margin: 0 }}>PCB Specs</h1>
        <Link to="/specs/new" className="btn btn-primary">+ New</Link>
      </div>

      {list.length === 0 ? (
        <EmptyState
          emoji="📋"
          title="No specs yet"
          hint="Create a PCB spec to define the components and tolerances to inspect."
          action={<Link to="/specs/new" className="btn btn-primary">Create spec</Link>}
        />
      ) : (
        <div className="list">
          {list.map((spec) => (
            <div key={spec.id} className="card">
              <div className="row-between">
                <Link to={`/specs/${spec.id}`} style={{ flex: 1 }}>
                  <strong>{spec.name}</strong>
                  <div className="faint">
                    v{spec.version} · {spec.components.length} components · {formatRelative(spec.updatedAt)}
                  </div>
                </Link>
                <div className="btn-row">
                  <button className="btn" onClick={() => navigate(`/specs/${spec.id}`)}>Edit</button>
                  <button
                    className="btn btn-danger"
                    disabled={del.isPending}
                    onClick={() => {
                      if (confirm(`Delete spec "${spec.name}"? This also removes its inspections.`)) {
                        del.mutate(spec.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {del.error && <div style={{ marginTop: 12 }}><ErrorBanner error={del.error} /></div>}
    </div>
  );
}
