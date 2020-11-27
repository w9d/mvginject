// ==UserScript==
// @name Unofficial MVGroup HTML5 eD2k hasher injector
// @description Inject ed2khash interface over Java Applet.
// @namespace mvg.inject.ed2khash
// @version 20201126.0
// @match *://docuwiki.net/postbot/
// @match *://docuwiki.net/postbotbeta/
// @match *://forums.mvgroup.org/releasedb/
// @grant GM_getResourceText
// @homepageURL https://github.com/w9d/mvginject
// @updateURL https://raw.githubusercontent.com/w9d/mvginject/beta/mvg.inject.ed2khash.meta.js
// @downloadURL https://raw.githubusercontent.com/w9d/mvginject/beta/mvg.inject.ed2khash.user.js
// @resource worker https://raw.githubusercontent.com/w9d/ed2khash/c006035d2ad4c5742a09f115ad0c483114970251/build/md4-worker.min.js#sha256=19995c6e7e9a231e96326bf09db243784835d497f7bc25c313b50197dcbe6af6
// @require https://raw.githubusercontent.com/w9d/ed2khash/c006035d2ad4c5742a09f115ad0c483114970251/build/ed2khash.min.js#sha256=f6b7bc82d8088e58de8e3eaf262d23ff3b9d88c67bbd98629cd37ac15696be84
// @require https://raw.githubusercontent.com/w9d/FileSaver.js/5ed507ef8aa53d8ecfea96d96bc7214cd2476fd2/FileSaver.min.js#sha256=14f249b7c9c0fb12f8454ebf82cae203ca7cc4078b19ab68c938e576f40a19d1
// ==/UserScript==

(function () {
  'use strict';

  const onlysinglefile = (window.location.hostname === 'forums.mvgroup.org')
  const applet = document.getElementById('theApplet')
  if (!applet) {
    mvglog('theApplet doesn\'t exist! are we running on the correct page?', true)
    return
  }

  if (typeof ed2khash !== 'function') {
    mvglog('we wanted to inject but we\'re missing ed2khash', true)
    return
  }

  let ourCode = [
    '<input type="file" id="__ed2kFileSelectionReal" ',
    'accept=".mkv, .mp4, .avi, .ts" style="display:none" ',
    (onlysinglefile || 'multiple ') + '/>'
  ]
  ourCode = ourCode.concat([
    '<input type="file" id="__ed2kFileSelectionReal_torrent" accept=".torrent" style="display:none" />',
    '<div style="background-color:#eee;padding:0px;font-family:Tahoma,Geneva,sans-serif;text-align:left;resize:none;width:405px;height:170px">',
    '<div style="background-color:#333;font-size:2em;color:white;width:405px;height:75px;text-align:center;line-height:75px">',
    '<div style="color:red;padding-right:5px;font-weight:bold;font-size:0.4em;line-height:20px;position:relative;top:0px;text-align:right">unofficial</div>',
    '<span style="position:relative;top:-20px">MVGroup<span style="color:#55d300">Hasher</span></span>',
    '<div style="color:#fff;padding-right:5px;font-weight:bold;font-size:0.4em;line-height:20px;position:relative;bottom:42px;text-align:right">',
    '<label for="__ed2k_MPC_disable" style="vertical-align:middle">disable mpc calculation<input type="checkbox" id="__ed2k_MPC_disable" style="vertical-align:middle" checked /></label>',
    '<label for="__ed2k_bittorrent_flag" style="vertical-align:middle">bittorrent (BEWARE)<input type="checkbox" id="__ed2k_bittorrent_flag" style="vertical-align:middle" /></label></div>',
    '</div>',
    '<button id="__ed2kFileSelection" disabled="true" style="margin:0;width:33.3%;height:25px">Open</button>',
    '<button id="__ed2kProcess" disabled="true" style="margin:0;width:33.3%;height:25px">Process</button>',
    '<button id="__ed2kSave" disabled="true" style="margin:0;width:33.3%;height:25px">Save</button>',
    '<button id="__ed2kReset" disabled="true" style="margin:0;width:33.3%;height:25px;float:right">Reset</button>',
    '<div id="__ed2kFileStatus" style="padding:5px;clear:left">Script has not executed.</div>',
    '<progress id="__ed2kProgressFile" style="width:100%"></progress><br />',
    '<progress id="__ed2kProgressFiles" style="width:100%"></progress>',
    '</div>',
    '<pre id="progress"></pre>'
  ])
  if (!onlysinglefile) {
    // currently docuwiki needs this element adding, releasedb already has it
    ourCode = ourCode.concat(['<textarea readOnly="readOnly" id="filehashes" ',
        'name="filehashes" cols="100" rows="5" style="width:100%;"></textarea>'
    ])
  }

  applet.innerHTML = ourCode.join('')
  mvglog('we\'ve injected our HTML successfully!', false)

  let files = [];
  let old_processed = [];
  let mpc_disable = true;
  let bittorrent_flag = false;
  const btnReset = document.getElementById('__ed2kReset');
  const btnSave = document.getElementById('__ed2kSave');
  const btnProcess = document.getElementById('__ed2kProcess');
  const btnFileSelectReal = document.getElementById('__ed2kFileSelectionReal');
  const btnFileSelectReal_torrent = document.getElementById('__ed2kFileSelectionReal_torrent');
  const btnFileSelect = document.getElementById('__ed2kFileSelection');
  const select_status = document.getElementById('__ed2kFileStatus');
  const select_pfile = document.getElementById('__ed2kProgressFile');
  const select_pfiles = document.getElementById('__ed2kProgressFiles');
  const chk_mpc_disable = document.getElementById('__ed2k_MPC_disable');
  chk_mpc_disable.addEventListener('change', function() {
    mpc_disable = chk_mpc_disable.checked && true;
  });
  mpc_disable = chk_mpc_disable.checked && true;
  const chk_bittorrent_flag = document.getElementById('__ed2k_bittorrent_flag');
  bittorrent_flag = chk_bittorrent_flag.checked && true;

  const ed2k_progress = function (_file, _current_file, _total_files) {
    select_pfile.value = _current_file;
    select_pfiles.value = _total_files;
  }
  const ed2k_file_done = function (f, sum) {
    let mpc_sum = !mpc_disable ? sum.mpc : 'abcdef0987654321'
    old_processed.push([ f.name, f.size, mpc_sum, sum.ed2k ])
    let hashes = [mpc_sum, sum.ed2k]
    fileHashed(f.name, f.size, hashes)
  }
  const ed2khasher = ed2khash();
  ed2khasher.onprogress = ed2k_progress;
  ed2khasher.onfilecomplete = ed2k_file_done;
  ed2khasher.onallcomplete = finishProcessingFiles;
  ed2khasher.onerror = function (e) { window.alert('ed2khash error: ' + e.message) }
  ed2khasher.setworker(getWorker())
  chk_bittorrent_flag.addEventListener('change', function() {
    bittorrent_flag = chk_bittorrent_flag.checked && true;
    ed2khasher.set_bittorrent_quirk(bittorrent_flag);
    resetEverything(null);
  });

  function handleFileSelect(evt) {
    var new_files = evt.target.files;
    var badfile_type = [], badfile_dup = [];
    var add = function(a, b) { return a + b.size };
    var dupfile = function(input_file, arr) {
      var input_name = input_file.name;
      for (var i = 0, f = null; f = arr[i]; i++) {
        if (input_name === f.name) {
          return true
        }
      }
      return false
    }

    old_processed = []
    if (onlysinglefile)
      files = []

    for (var i = 0, f; f = new_files[i]; i++) {
      if (!f.name.match('\.(mkv|mp4|avi|ts)$')) {
        badfile_type.push(f.name)
        continue;
      }
      if (dupfile(f, files)) {
        badfile_dup.push(f.name)
        continue;
      }
      files.push(f);
    }

    if (badfile_type.length !== 0 || badfile_dup.length !== 0) {
      var str = ''
      if (badfile_type.length !== 0) {
        str += 'We only accept the MP4, MKV, AVI and TS (mpegts) multimedia containers. ' +
          'The following files were ignored:\n\n'
        str += badfile_type.join('\n')
      }
      if (badfile_dup.length !== 0) {
        str += (badfile_type.length !== 0 ? '\n\n' : '')
        str += 'You cannot insert the same file multiple times. ' +
          'The following files were ignored:\n\n'
        str += badfile_dup.join('\n')
      }
      window.alert(str)
    }

    btnFileSelectReal.value = ''; // stupid chrome behaviour
    if (files.length === 0)
      return

    select_status.textContent = prettybytes(files.reduce(add, 0)) +
      ' for ' + files.length + ' ' + ((files.length==1) && 'file' || 'files');
    btnSave.disabled = true;
    btnReset.disabled = false;
    btnProcess.disabled = false;
  }

  function handleFileSelect_torrent(evt) {
    const new_files = evt.target.files;
    if (new_files.length !== 1) {
      mvglog('files len not one?!', true);
      return;
    }
    files = [];
    files.push(new_files[0]);
    startProcessingFiles(false);
    select_status.textContent = 'hopefully one torrent selected';
    btnSave.disabled = true;
    btnReset.disabled = false;
    btnProcess.disabled = true;
  }

  function resetEverything(evt) {
    old_processed = [];
    files = [];
    btnSave.disabled = true;
    btnReset.disabled = true;
    btnProcess.disabled = true;
    nolongerprocess(true, true);
  }

  function startProcessingFiles(evt) {
    if (ed2khasher.isbusy()) {
      nolongerprocess(true, false);
      return;
    }

    if (!(files[0])) {
      mvglog('no file to process, this should never happen', false);
      return;
    }

    filesBegin() // mvg change
    ed2khasher.execute(files);
    btnFileSelect.disabled = true;
    btnSave.disabled = true;
    btnProcess.textContent = 'Cancel';
  }

  function finishProcessingFiles() {
    files = [];
    select_status.textContent = 'No file' + (onlysinglefile ? '' : 's') +
      ' selected.';
    btnProcess.disabled = true
    btnSave.disabled = false
    nolongerprocess(false, false)
    filesEnd() // mvg change
  }

  function handleSave() {
    var str = ''
    for (var i = 0, p; p = old_processed[i]; i++) {
      str += p.join('\t') + '\r\n'
    }
    var blob = new Blob([str], { type: 'text/plain;charset=utf-8' })
    saveAs(blob, 'mvghashes.txt', true)
    resetEverything(null)
  }

  function nolongerprocess(kill_active, progressbar) {
    if (kill_active)
      ed2khasher.terminate();
    btnFileSelect.disabled = false;
    btnProcess.textContent = 'Process';
    if (progressbar) {
      select_pfile.value = 0;
      select_pfiles.value = 0;
      select_status.textContent = 'No file' + (onlysinglefile ? '' : 's') +
        ' selected.';
    }
  }

  function prettybytes(val) {
    if (val < 1) return '0.00 bytes'
    var selector = Math.floor(Math.log2(val)/10)
    return (val / Math.pow(1024, selector)).toFixed(2) + ' ' +
      ['bytes','KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'][selector]
  }

  function getWorker () {
    function resourceToBlobUrl(resourceName) {
      var blob = new Blob([GM_getResourceText(resourceName)], {
        type: 'text/javascript'
      });
      return window.URL.createObjectURL(blob)
    }
    var workerURL = resourceToBlobUrl('worker')
    return new Worker(workerURL)
  }

  function mvglog (message, error) {
    if (error)
      console.error('mvg-inject: ' + message)
    else
      console.log('mvg-inject: ' + message)
  }

  btnFileSelectReal.addEventListener('change', handleFileSelect, false);
  btnFileSelectReal_torrent.addEventListener('change', handleFileSelect_torrent, false);
  btnFileSelect.addEventListener('click', function() {
    if (!bittorrent_flag)
      btnFileSelectReal.click()
    else
      btnFileSelectReal_torrent.click()
  }, false);
  btnReset.addEventListener('click', resetEverything, false);
  btnProcess.addEventListener('click', startProcessingFiles, false);
  btnSave.addEventListener('click', handleSave, false);
  nolongerprocess(false, true)
})()
