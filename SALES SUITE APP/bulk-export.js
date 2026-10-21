// "Download all PDFs" for the Quotes and Acknowledgements history screens.
// In Chrome/Edge the user picks a destination folder and each PDF is written straight
// into it; elsewhere it falls back to a single ZIP download. Items are built one at a
// time so a long history doesn't freeze the page or hold every PDF in memory at once
// (except in the ZIP fallback, which has to).
(function (global) {
  function safeName(name) {
    return String(name).replace(/[\\/:*?"<>|]+/g, '-');
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // opts: { button, statusEl, label, zipName, items: [{ name, build() -> Blob }] }
  async function run(opts) {
    const { button, statusEl, label, zipName, items } = opts;
    const say = (text, isError) => {
      statusEl.textContent = text;
      statusEl.classList.toggle('error', !!isError);
    };
    if (!items.length) { say('No ' + label + 's to download yet.', true); return; }

    // The folder picker needs the click's user activation, so it has to be the first
    // await — before any PDF work starts.
    let dir = null;
    if (global.showDirectoryPicker) {
      try {
        dir = await global.showDirectoryPicker({ mode: 'readwrite' });
      } catch (err) {
        if (err && err.name === 'AbortError') { say(''); return; }
        dir = null;
      }
    }
    if (!dir && !global.JSZip) { say('Could not open the folder picker, and the ZIP fallback failed to load.', true); return; }

    button.disabled = true;
    const zip = dir ? null : new global.JSZip();
    const used = {};
    let done = 0;
    const failed = [];

    for (const item of items) {
      let name = safeName(item.name);
      if (used[name]) { used[name]++; name = name.replace(/\.pdf$/i, '') + ' (' + used[name] + ').pdf'; } else { used[name] = 1; }
      say('Saving ' + (done + failed.length + 1) + ' of ' + items.length + '…');
      try {
        const blob = item.build();
        if (dir) {
          const handle = await dir.getFileHandle(name, { create: true });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        } else {
          zip.file(name, blob);
        }
        done++;
      } catch (err) {
        failed.push(name);
      }
      // Yield so the status text repaints between PDFs.
      await new Promise((r) => setTimeout(r, 0));
    }

    try {
      if (zip && done) {
        say('Zipping…');
        download(await zip.generateAsync({ type: 'blob' }), safeName(zipName));
      }
    } catch (err) {
      say('Could not create the ZIP: ' + err.message, true);
      button.disabled = false;
      return;
    }

    button.disabled = false;
    const where = dir ? 'in the folder you chose' : 'as ' + safeName(zipName) + ' in your Downloads';
    say('Saved ' + done + ' of ' + items.length + ' ' + label + ' PDF(s) ' + where + '.' +
      (failed.length ? ' Failed: ' + failed.join(', ') : ''), failed.length > 0);
  }

  global.BulkExport = { run: run };
})(window);
