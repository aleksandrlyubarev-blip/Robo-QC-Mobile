import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSpec, useCreateSpec, useUpdateSpec } from "../api/hooks";
import { Loader, ErrorBanner } from "../components/states";
import type { ComponentSpec, ComponentType, BoardDimensions } from "../api/types";

const COMPONENT_TYPES: ComponentType[] = [
  "screw",
  "connector",
  "heatsink",
  "solder_element",
  "press_fit",
  "through_hole",
  "osfp_cage",
  "cable",
];

function makeComponent(index: number): ComponentSpec {
  return {
    componentId: `comp-${index + 1}`,
    type: "screw",
    label: `Component ${index + 1}`,
    textPrompt: "",
    expectedPosition: { x: 0, y: 0, z: 0 },
    expectedOrientation: { roll: 0, pitch: 0, yaw: 0 },
    expectedExtent: { width: 5, height: 5, depth: 5 },
    positionTolerance: 2,
    orientationTolerance: 10,
    extentTolerance: 2,
    required: true,
    minConfidenceScore: 0.5,
  };
}

export function SpecEditorPage() {
  const params = useParams();
  const navigate = useNavigate();
  const id = params.id ? Number(params.id) : undefined;
  const isEdit = id != null;

  const existing = useSpec(id);
  const create = useCreateSpec();
  const update = useUpdateSpec(id ?? -1);

  const [name, setName] = useState("");
  const [version, setVersion] = useState("1.0");
  const [board, setBoard] = useState<BoardDimensions>({ widthMm: 100, heightMm: 100, depthMm: 2 });
  const [components, setComponents] = useState<ComponentSpec[]>([]);

  useEffect(() => {
    if (existing.data) {
      setName(existing.data.name);
      setVersion(existing.data.version);
      if (existing.data.boardDimensions) setBoard(existing.data.boardDimensions);
      setComponents(existing.data.components ?? []);
    }
  }, [existing.data]);

  if (isEdit && existing.isLoading) return <Loader />;
  if (isEdit && existing.error) return <ErrorBanner error={existing.error} />;

  const pending = create.isPending || update.isPending;
  const mutationError = create.error || update.error;

  function patchComponent(idx: number, patch: Partial<ComponentSpec>) {
    setComponents((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  async function handleSave() {
    const payload = {
      name: name.trim(),
      version: version.trim() || "1.0",
      boardDimensions: board,
      components,
    };
    if (isEdit) {
      await update.mutateAsync(payload);
    } else {
      await create.mutateAsync(payload);
    }
    navigate("/specs");
  }

  return (
    <div>
      <button className="btn" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>← Back</button>
      <h1 className="page-title">{isEdit ? "Edit Spec" : "New PCB Spec"}</h1>

      <div className="card">
        <div className="field">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Switch board rev B" />
        </div>
        <div className="field">
          <label>Version</label>
          <input value={version} onChange={(e) => setVersion(e.target.value)} />
        </div>
        <label className="field" style={{ marginBottom: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-dim)" }}>
            Board dimensions (mm)
          </span>
          <div className="field-row" style={{ marginTop: 6 }}>
            <input type="number" value={board.widthMm} onChange={(e) => setBoard({ ...board, widthMm: Number(e.target.value) })} placeholder="W" />
            <input type="number" value={board.heightMm} onChange={(e) => setBoard({ ...board, heightMm: Number(e.target.value) })} placeholder="H" />
            <input type="number" value={board.depthMm} onChange={(e) => setBoard({ ...board, depthMm: Number(e.target.value) })} placeholder="D" />
          </div>
        </label>
      </div>

      <div className="row-between" style={{ margin: "20px 0 10px" }}>
        <div className="section-label" style={{ margin: 0 }}>Components ({components.length})</div>
        <button
          className="btn"
          onClick={() => setComponents((prev) => [...prev, makeComponent(prev.length)])}
        >
          + Add component
        </button>
      </div>

      <div className="list">
        {components.map((comp, idx) => (
          <ComponentForm
            key={idx}
            comp={comp}
            onChange={(patch) => patchComponent(idx, patch)}
            onRemove={() => setComponents((prev) => prev.filter((_, i) => i !== idx))}
          />
        ))}
        {components.length === 0 && (
          <div className="card muted">No components. Add at least one to inspect.</div>
        )}
      </div>

      {mutationError && <div style={{ marginTop: 14 }}><ErrorBanner error={mutationError} /></div>}

      <button
        className="btn btn-primary btn-block btn-lg"
        style={{ marginTop: 18 }}
        disabled={pending || !name.trim()}
        onClick={handleSave}
      >
        {pending ? "Saving…" : isEdit ? "Save changes" : "Create spec"}
      </button>
    </div>
  );
}

function ComponentForm({
  comp,
  onChange,
  onRemove,
}: {
  comp: ComponentSpec;
  onChange: (patch: Partial<ComponentSpec>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="card">
      <div className="row-between" style={{ marginBottom: 10 }}>
        <strong>{comp.label || comp.componentId}</strong>
        <button className="btn btn-danger" onClick={onRemove}>Remove</button>
      </div>

      <div className="grid-2">
        <div className="field">
          <label>Component ID</label>
          <input value={comp.componentId} onChange={(e) => onChange({ componentId: e.target.value })} />
        </div>
        <div className="field">
          <label>Label</label>
          <input value={comp.label} onChange={(e) => onChange({ label: e.target.value })} />
        </div>
      </div>

      <div className="field">
        <label>Type</label>
        <select value={comp.type} onChange={(e) => onChange({ type: e.target.value as ComponentType })}>
          {COMPONENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Text prompt (WildDet3D)</label>
        <input
          value={comp.textPrompt}
          onChange={(e) => onChange({ textPrompt: e.target.value })}
          placeholder="e.g. silver hex screw"
        />
      </div>

      <label className="field">
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-dim)" }}>Expected position (x, y, z mm)</span>
        <div className="field-row" style={{ marginTop: 6 }}>
          <input type="number" value={comp.expectedPosition.x} onChange={(e) => onChange({ expectedPosition: { ...comp.expectedPosition, x: Number(e.target.value) } })} />
          <input type="number" value={comp.expectedPosition.y} onChange={(e) => onChange({ expectedPosition: { ...comp.expectedPosition, y: Number(e.target.value) } })} />
          <input type="number" value={comp.expectedPosition.z} onChange={(e) => onChange({ expectedPosition: { ...comp.expectedPosition, z: Number(e.target.value) } })} />
        </div>
      </label>

      <label className="field">
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-dim)" }}>Orientation (roll, pitch, yaw °)</span>
        <div className="field-row" style={{ marginTop: 6 }}>
          <input type="number" value={comp.expectedOrientation.roll} onChange={(e) => onChange({ expectedOrientation: { ...comp.expectedOrientation, roll: Number(e.target.value) } })} />
          <input type="number" value={comp.expectedOrientation.pitch} onChange={(e) => onChange({ expectedOrientation: { ...comp.expectedOrientation, pitch: Number(e.target.value) } })} />
          <input type="number" value={comp.expectedOrientation.yaw} onChange={(e) => onChange({ expectedOrientation: { ...comp.expectedOrientation, yaw: Number(e.target.value) } })} />
        </div>
      </label>

      <label className="field">
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-dim)" }}>Extent (w, h, d mm)</span>
        <div className="field-row" style={{ marginTop: 6 }}>
          <input type="number" value={comp.expectedExtent.width} onChange={(e) => onChange({ expectedExtent: { ...comp.expectedExtent, width: Number(e.target.value) } })} />
          <input type="number" value={comp.expectedExtent.height} onChange={(e) => onChange({ expectedExtent: { ...comp.expectedExtent, height: Number(e.target.value) } })} />
          <input type="number" value={comp.expectedExtent.depth} onChange={(e) => onChange({ expectedExtent: { ...comp.expectedExtent, depth: Number(e.target.value) } })} />
        </div>
      </label>

      <label className="field">
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-dim)" }}>Tolerances (pos mm, orient °, extent mm)</span>
        <div className="field-row" style={{ marginTop: 6 }}>
          <input type="number" value={comp.positionTolerance} onChange={(e) => onChange({ positionTolerance: Number(e.target.value) })} />
          <input type="number" value={comp.orientationTolerance} onChange={(e) => onChange({ orientationTolerance: Number(e.target.value) })} />
          <input type="number" value={comp.extentTolerance} onChange={(e) => onChange({ extentTolerance: Number(e.target.value) })} />
        </div>
      </label>

      <div className="grid-2">
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Min confidence (0–1)</label>
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={comp.minConfidenceScore}
            onChange={(e) => onChange({ minConfidenceScore: Number(e.target.value) })}
          />
        </div>
        <label className="field" style={{ marginBottom: 0, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 24 }}>
          <input
            type="checkbox"
            style={{ width: "auto" }}
            checked={comp.required}
            onChange={(e) => onChange({ required: e.target.checked })}
          />
          <span style={{ fontSize: 14 }}>Required component</span>
        </label>
      </div>
    </div>
  );
}
