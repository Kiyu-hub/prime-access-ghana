/* ============================================================
   Clasikal Homes — Runtime config
   Fill these four values, save, reload the browser. That's it.

   • SUPABASE_URL & SUPABASE_ANON_KEY:
       Supabase dashboard → Settings → API
       Use the "Project URL" and the "anon public" key (NOT the service_role key).

   • CLOUDINARY_CLOUD_NAME:
       The cloud name shown at the top of your Cloudinary dashboard.
       (You already have this: dnoji4yat — pasted in below.)

   • CLOUDINARY_UPLOAD_PRESET:
       Cloudinary console → Settings → Upload → Upload presets
       → Add upload preset → Signing Mode = Unsigned → Save.
       Paste the preset's name here. NEVER put the API secret here.

   This file is loaded as a regular script (no module), so window.CH_CONFIG is global.
   ============================================================ */

window.CH_CONFIG = {
    SUPABASE_URL:            'https://xmczczqaxlcremlojqyb.supabase.co',
    SUPABASE_ANON_KEY:       'sb_publishable_UtkdO8Osq7VQiv24hbIQbA_FGGZhUTN',

    CLOUDINARY_CLOUD_NAME:   'dnoji4yat',
    CLOUDINARY_UPLOAD_PRESET: 'clasikal_unsigned',  // unsigned preset name

    // Optional: folder inside Cloudinary where uploads land
    CLOUDINARY_FOLDER:       'clasikal-products',
};

/* Quick sanity warning in the console if anything is missing */
(function () {
    const missing = Object.entries(window.CH_CONFIG)
        .filter(([k, v]) => !v && k !== 'CLOUDINARY_FOLDER')
        .map(([k]) => k);
    if (missing.length) {
        console.warn(
            '[Clasikal Homes] Missing config values: ' + missing.join(', ') +
            '\nOpen scripts/config.js and fill them in. See SETUP.md for details.'
        );
    }
})();
