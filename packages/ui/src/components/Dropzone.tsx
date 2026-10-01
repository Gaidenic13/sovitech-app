import { CloudUpload, FileText } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';

export interface DropzoneLabels {
  /** "Drag and drop your files here" */
  readonly title: string;
  /** "or" */
  readonly or: string;
  /** "Browse files" */
  readonly browse: string;
  /** The accepted formats line: "PDF, DWG, IFC, RVT, XLSX, DOCX, JPG, PNG, ZIP". */
  readonly formats: string;
  /**
   * The size limit line, exactly the render allowlist's reviewed fixed copy "Max file size 500 MB"
   * (rule 2's own example of the reviewed list). It renders alone in its element, as the entry reads it.
   */
  readonly limit: string;
}

export interface DropzoneProps {
  readonly labels: DropzoneLabels;
  /** The file input's `accept` list (extensions); the client checks format and size again before upload. */
  readonly accept?: string;
  /** Called with the files dropped or chosen, in order. */
  readonly onFiles: (files: readonly File[]) => void;
}

/**
 * Step 2's dropzone (onboarding-spec 3, step 2; UD-33: drag-over state; F-INGEST-01). A drop target
 * with the "Browse files" button, which opens the platform's file chooser: the button is the
 * keyboard path (Tab, then Enter or Space), so nothing depends on dragging. Dragging over it shows
 * the accent border and the mint 8% fill. It shows no size and no count (rule 2; proposal 7.2.30):
 * the files' rows below it say what happened to each.
 */
export function Dropzone({ labels, accept, onFiles }: DropzoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const onDragOver = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    if (!dragging) setDragging(true);
  };
  const onDragLeave = (event: DragEvent<HTMLDivElement>): void => {
    // Moving between the dropzone's own children fires dragleave on the parent; only leaving it counts.
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setDragging(false);
  };
  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    const files = [...event.dataTransfer.files];
    if (files.length > 0) onFiles(files);
  };

  return (
    <div
      className="sov-dropzone"
      data-dragging={dragging ? 'true' : 'false'}
      onDragEnter={onDragOver}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <Icon icon={CloudUpload} size="large" />
      <p className="sov-dropzone__title">{labels.title}</p>
      <p className="sov-dropzone__or">{labels.or}</p>
      <Button variant="accent" icon={FileText} onClick={() => input.current?.click()}>
        {labels.browse}
      </Button>
      <input
        ref={input}
        type="file"
        multiple
        accept={accept}
        hidden
        tabIndex={-1}
        onChange={(event) => {
          const chosen = event.currentTarget.files;
          if (chosen === null) return;
          const files = [...chosen];
          event.currentTarget.value = '';
          if (files.length > 0) onFiles(files);
        }}
      />
      <p className="sov-dropzone__meta">{labels.formats}</p>
      <p className="sov-dropzone__meta">{labels.limit}</p>
    </div>
  );
}
