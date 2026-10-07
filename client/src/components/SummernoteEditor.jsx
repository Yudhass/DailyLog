import { useEffect, useRef } from 'react';
import $ from '../lib/jquerySetup.js';
import 'summernote/dist/summernote-lite.css';
import 'summernote/dist/summernote-lite.js';
import 'summernote/dist/lang/summernote-id-ID.js';

// Kecilkan gambar upload ke maks 880px (jpeg 0.82) agar ringan di DB & kartu.
function downscale(dataUrl, done, max = 880) {
  const img = new Image();
  img.onload = () => {
    if (img.width <= max) return done(dataUrl);
    const scale = max / img.width;
    const canvas = document.createElement('canvas');
    canvas.width = max;
    canvas.height = Math.round(img.height * scale);
    done(canvas.toDataURL('image/jpeg', 0.82));
  };
  img.onerror = () => done(dataUrl);
  img.src = dataUrl;
}

// Wrapper Summernote (lite, tanpa Bootstrap) yang aman untuk React 19 + StrictMode:
// inisialisasi sekali per editorKey, sinkron nilai luar tanpa re-init, destroy saat lepas.
export default function SummernoteEditor({
  value,
  onChange,
  placeholder = 'Tulis deskripsi…',
  height = 280,
  editorKey = 'editor',
  disabled = false,
}) {
  const boxRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const $el = $(el);

    try {
      if ($el.next('.note-editor').length) $el.summernote('destroy');
    } catch {
      /* abaikan */
    }

    $el.summernote({
      lang: 'id-ID',
      placeholder,
      tabsize: 2,
      height,
      dialogsInBody: true,
      followingToolbar: false,
      toolbar: [
        ['font', ['bold', 'italic', 'underline', 'clear']],
        ['color', ['color']],
        ['para', ['ul', 'ol', 'paragraph']],
        ['insert', ['link', 'picture']],
        ['view', ['codeview']],
      ],
      callbacks: {
        onInit() {
          try {
            $el.summernote('code', value || '');
          } catch {
            /* abaikan */
          }
          if (disabled) {
            try {
              $el.summernote('disable');
            } catch {
              /* abaikan */
            }
          }
        },
        onChange(contents) {
          onChangeRef.current?.(contents ?? '');
        },
        onImageUpload(files) {
          const list = Array.from(files || []).filter((f) => f?.type?.startsWith('image/'));
          if (!list.length) return;
          list.forEach((file) => {
            if (file.size > 2 * 1024 * 1024) return;
            const reader = new FileReader();
            reader.onload = () => {
              downscale(String(reader.result || ''), (small) => {
                try {
                  $el.summernote('insertImage', small, file.name || 'gambar');
                } catch {
                  /* abaikan */
                }
              });
            };
            reader.readAsDataURL(file);
          });
        },
      },
    });

    return () => {
      try {
        if ($el.next('.note-editor').length) $el.summernote('destroy');
      } catch {
        /* abaikan */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorKey]);

  // Sinkronkan perubahan nilai dari luar (mis. ganti catatan) tanpa re-init.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    try {
      if ($(el).next('.note-editor').length) {
        const cur = $(el).summernote('code');
        if ((cur || '') !== (value || '')) $(el).summernote('code', value || '');
      }
    } catch {
      /* abaikan */
    }
  }, [value]);

  return (
    <div className="summernote-wrap">
      <div ref={boxRef} aria-label={placeholder} />
    </div>
  );
}
