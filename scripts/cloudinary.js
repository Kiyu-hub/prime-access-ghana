/* ============================================================
   Clasikal Homes — Cloudinary unsigned uploads
   Uses ONLY cloud_name + unsigned upload preset from config.js.
   API secret is NEVER used in client code.
   ============================================================ */
(function () {
    'use strict';

    const cfg = window.CH_CONFIG || {};

    function isConfigured() {
        return !!(cfg.CLOUDINARY_CLOUD_NAME && cfg.CLOUDINARY_UPLOAD_PRESET);
    }

    function upload(file, onProgress) {
        return new Promise((resolve, reject) => {
            if (!isConfigured()) {
                reject(new Error('Image uploads are not set up yet. Please ask the Director.'));
                return;
            }
            if (!(file instanceof Blob)) {
                reject(new Error('No file selected.'));
                return;
            }

            const url = 'https://api.cloudinary.com/v1_1/' + encodeURIComponent(cfg.CLOUDINARY_CLOUD_NAME) + '/image/upload';
            const fd = new FormData();
            fd.append('file', file);
            fd.append('upload_preset', cfg.CLOUDINARY_UPLOAD_PRESET);
            // NOTE: deliberately NOT sending `folder` — the unsigned preset is the source of truth
            // for folder + transformations. Sending folder here can conflict with a preset that
            // restricts it, causing "Upload preset must whitelist this folder" errors.

            const xhr = new XMLHttpRequest();
            xhr.open('POST', url);
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable && typeof onProgress === 'function') {
                    onProgress(Math.round((e.loaded / e.total) * 100));
                }
            };
            xhr.onload = () => {
                let parsed = null;
                try { parsed = JSON.parse(xhr.responseText); } catch (_) {}
                if (xhr.status >= 200 && xhr.status < 300 && parsed && parsed.secure_url) {
                    resolve({
                        url: parsed.secure_url,
                        public_id: parsed.public_id,
                        width: parsed.width,
                        height: parsed.height,
                        bytes: parsed.bytes,
                    });
                    return;
                }
                // Generic, non-technical message for users.
                // Detailed diagnostics go to the console for the Director.
                let msg = 'Image upload failed. Please try again or use a different image.';
                if (xhr.status === 0) {
                    msg = 'Network error — please check your internet connection.';
                } else if (xhr.status === 401 || xhr.status === 400) {
                    msg = 'Image uploads are not set up correctly. Please ask the Director.';
                }
                console.error('[CH] image upload failed', { status: xhr.status, body: xhr.responseText, parsed });
                reject(new Error(msg));
            };
            xhr.onerror = () => reject(new Error('Network error during upload. Please check your internet connection.'));
            xhr.ontimeout = () => reject(new Error('Upload timed out. Please try a smaller image.'));
            xhr.timeout = 60_000;
            xhr.send(fd);
        });
    }

    window.CH = Object.assign(window.CH || {}, {
        cloudinary: { upload, isConfigured },
    });
})();
