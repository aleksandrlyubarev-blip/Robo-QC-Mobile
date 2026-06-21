import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Camera, ImageUp, Aperture, RotateCcw, ClipboardList, ImageOff, ArrowRight } from "lucide-react";
import { useSpecs, useCreateInspection } from "../api/hooks";
import { useMode } from "../app/mode";
import { useCamera, fileToDataUrl } from "../lib/camera";
import { Loader, ErrorBanner, EmptyState } from "../components/states";

export function NewInspectionPage() {
  const navigate = useNavigate();
  const { operatorId } = useMode();
  const specs = useSpecs();
  const create = useCreateInspection();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [specId, setSpecId] = useState<number | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  const camera = useCamera(cameraOn && !image);

  if (specs.isLoading) return <Loader />;
  if (specs.error) return <ErrorBanner error={specs.error} />;

  const specList = specs.data ?? [];
  if (specList.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList size={40} strokeWidth={1.5} />}
        title="No specs available"
        hint="Create a PCB spec first, then start an inspection against it."
        action={<Link to="/specs/new" className="btn btn-primary">Create spec</Link>}
      />
    );
  }

  const effectiveSpecId = specId ?? specList[0]!.id;

  function handleCapture() {
    const data = camera.capture();
    if (data) {
      setImage(data);
      setCameraOn(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImage(await fileToDataUrl(file));
      setCameraOn(false);
    }
  }

  async function handleSubmit() {
    const inspection = await create.mutateAsync({
      specId: effectiveSpecId,
      operatorId,
      capturedImageUrl: image,
      deviceInfo: { userAgent: navigator.userAgent },
    });
    navigate(`/inspections/${inspection.id}`);
  }

  return (
    <div>
      <h1 className="page-title">New Inspection</h1>

      <div className="card">
        <div className="field" style={{ marginBottom: 0 }}>
          <label>PCB Spec</label>
          <select value={effectiveSpecId} onChange={(e) => setSpecId(Number(e.target.value))}>
            {specList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} (v{s.version}) · {s.components.length} components
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="section-label">Capture board image</div>

      <div className="capture-stage">
        {image ? (
          <img src={image} alt="Captured board" />
        ) : cameraOn ? (
          <>
            <video ref={camera.videoRef} playsInline muted />
            <div className="capture-overlay" />
          </>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--text-faint)",
              gap: 8,
            }}
          >
            <ImageOff size={40} strokeWidth={1.5} />
            <div className="faint">No image yet</div>
          </div>
        )}
      </div>

      {camera.error && <div style={{ marginTop: 10 }}><ErrorBanner error={camera.error} /></div>}

      <div className="capture-controls">
        {image ? (
          <button className="btn btn-block" onClick={() => { setImage(null); }}>
            <RotateCcw size={16} /> Retake
          </button>
        ) : cameraOn ? (
          <button className="btn btn-primary shutter btn-lg" onClick={handleCapture} disabled={!camera.ready}>
            <Aperture size={18} /> Capture
          </button>
        ) : (
          <>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setCameraOn(true)}>
              <Camera size={16} /> Open camera
            </button>
            <button className="btn" style={{ flex: 1 }} onClick={() => fileInputRef.current?.click()}>
              <ImageUp size={16} /> Upload
            </button>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleFile}
      />

      {create.error && <div style={{ marginTop: 14 }}><ErrorBanner error={create.error} /></div>}

      <button
        className="btn btn-primary btn-block btn-lg"
        style={{ marginTop: 18 }}
        disabled={create.isPending}
        onClick={handleSubmit}
      >
        {create.isPending ? (
          "Creating…"
        ) : (
          <>{image ? "Create & continue" : "Create without image"} <ArrowRight size={17} /></>
        )}
      </button>
      <p className="faint" style={{ textAlign: "center", marginTop: 10 }}>
        You'll run the WildDet3D analysis on the next screen.
      </p>
    </div>
  );
}
