// ==UserScript==
// @name Unofficial MVGroup HTML5 eD2k hasher injector
// @description Inject ed2khash interface over Java Applet.
// @namespace mvg.inject.ed2khash
// @version 3
// @match *://docuwiki.net/postbot/
// @match *://forums.mvgroup.org/releasedb/
// @grant GM_getResourceText
// @homepageURL https://github.com/w9d/mvginject
// @updateURL https://raw.githubusercontent.com/w9d/mvginject/master/mvg.inject.ed2khash.meta.js
// @downloadURL https://raw.githubusercontent.com/w9d/mvginject/master/mvg.inject.ed2khash.user.js
// @resource worker https://raw.githubusercontent.com/w9d/ed2khash/833e80c484833982517b4c7b1f0e77ceeb677e96/build/md4-worker.min.js#sha256=d0330e838f487c4338d1b114f78e58045c36cbac0d1bfff6fa601e35be44eaee
// @require https://raw.githubusercontent.com/w9d/ed2khash/833e80c484833982517b4c7b1f0e77ceeb677e96/build/ed2khash.min.js#sha256=6e1230f73f04112d50a4082744a84ccc725e89ad8ea7c93673461852180ca353
// @require https://raw.githubusercontent.com/emn178/js-sha256/189bb9b03782b80e59516dfbea78f16b5d9754ce/build/sha256.min.js#sha256=7157511697db744d384a5a2a8646af23f3c90560abf93bb240fdd690b29a898a
// ==/UserScript==

(function () {
  'use strict';

  var onlysinglefile = (window.location.hostname === 'forums.mvgroup.org')
  var applet = document.getElementById('theApplet')
  if (!applet) {
    console.log('mvg-inject: theApplet doesn\'t exist! are we running on the correct page?')
    return
  }

  var applet_shas = [
    '1af653111df5dde8bfed0f1da6c677232970aa1342fa956b353799962a07a33b',/*docuwiki/postbot*/
    '37139811907c2425441b20340bf8d982bc2784aa9c6739f73ae848cca79b096f' /*mvg/releasedb*/
  ]
  var applet_sha = sha256(applet.innerHTML)

  if (typeof ed2khash !== 'function') {
    mvglog('we wanted to inject but we\'re missing ed2khash', true)
    return
  }
  if (applet_shas.indexOf(applet_sha) === -1) {
    mvglog('we wanted to inject but the target element has changed', true)
    mvglog('theApplet contents="' + applet.innerHTML + '"')
    mvglog('theApplet sha256=' + applet_sha)
    window.alert(failstr)
    return
  }

  var ourCode = [
    '<input type="file" id="__ed2kFileSelectionReal" ',
    'accept=".mkv, .mp4, .avi" style="display:none" ',
    (onlysinglefile || 'multiple ') + '/>'
  ]
  ourCode = ourCode.concat([
    '<div style="background-color:#eee;padding:0px;font-family:Tahoma,Geneva,sans-serif;text-align:left;resize:none;width:405px;height:170px">',
    '<div style="background-color:#333;font-size:2em;color:white;width:405px;height:75px;text-align:center;line-height:75px">',
    '<span style="color:red;padding-right:5px;font-weight:bold;font-size:0.4em;line-height:20px;float:right">unofficial</span>',
    'MVGroup<span style="color:#55d300">Hasher</span>',
    '</div>',
    '<button id="__ed2kFileSelection" disabled="true" style="margin:0;width:33.3%;height:25px">Open</button>',
    '<button id="__ed2kProcess" disabled="true" style="margin:0;width:33.3%;height:25px">Process</button>',
    '<button id="__ed2kSave" disabled="true" style="margin:0;width:33.3%;height:25px">Save (soon)</button>',
    '<button id="__ed2kReset" disabled="true" style="margin:0;width:33.3%;height:25px;float:right">Reset</button>',
    '<div id="__ed2kFileStatus" style="padding:5px;clear:left">Script has not executed.</div>',
    '<progress id="__ed2kProgressFile" style="width:100%"></progress><br />',
    '<progress id="__ed2kProgressFiles" style="width:100%"></progress>',
    '</div>'
  ])
  if (!onlysinglefile) {
    // currently docuwiki needs this element adding, releasedb already has it
    ourCode = ourCode.concat(['<textarea readOnly="readOnly" id="filehashes" ',
        'name="filehashes" cols="100" rows="5" style="width:100%;"></textarea>'
    ])
  }

  applet.innerHTML = ourCode.join('')
  console.log('mvg-inject: we\'ve injected our HTML successfully!')

  var files = [];
  var btnReset = document.getElementById('__ed2kReset');
  var btnSave = document.getElementById('__ed2kSave');
  var btnProcess = document.getElementById('__ed2kProcess');
  var btnFileSelectReal = document.getElementById('__ed2kFileSelectionReal');
  var btnFileSelect = document.getElementById('__ed2kFileSelection');
  var select_status = document.getElementById('__ed2kFileStatus');
  var select_pfile = document.getElementById('__ed2kProgressFile');
  var select_pfiles = document.getElementById('__ed2kProgressFiles');

  var ed2k_progress = function (_file, _current_file, _total_files) {
    select_pfile.value = _current_file;
    select_pfiles.value = _total_files;
  }
  var ed2k_file_done = function (f, sum) {
    //ed2k_text.value += f.name + '\t' + f.size + '\t' + sum.mpc + '\t' + sum.ed2k + '\n';
    var hashes = [sum.mpc, sum.ed2k]
    fileHashed(f.name, f.size, hashes)
  }
  var ed2khasher = ed2khash();
  ed2khasher.onprogress = ed2k_progress;
  ed2khasher.onfilecomplete = ed2k_file_done;
  ed2khasher.onallcomplete = finishProcessingFiles;
  ed2khasher.onerror = function (e) { window.alert('ed2khash error: ' + e.message) }
  ed2khasher.setworker(getWorker())

  function handleFileSelect(evt) {
    var new_files = evt.target.files;
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

    if (onlysinglefile)
      files = []

    for (var i = 0, f; f = new_files[i]; i++) {
      if (!f.name.match('\.(mkv|mp4|avi)$')) {
        window.alert('We only accept the MP4, MKV and AVI multimedia containers.' +
          '\n\nYour selection "' + f.name + '" was ignored.');
        continue;
      }
      if (dupfile(f, files)) {
        window.alert('Err... you cannot insert the same file multiple times.' +
          '\n\nRemoved "' + f.name + '"');
        continue;
      }
      files.push(f);
    }

    if (files.length === 0)
      return

    select_status.textContent = (files.reduce(add,0)/1000000000).toPrecision(3)+
      'GB for ' + files.length + ' ' + ((files.length==1)&&'file'||'files');
    btnSave.disabled = true;
    btnReset.disabled = false;
    btnProcess.disabled = false;
  }

  function resetEverything(evt) {
    files = [];
    select_status.textContent = 'No files selected.';
    btnFileSelectReal.value = '' // stupid chrome bug
    btnSave.disabled = true;
    btnReset.disabled = true;
    btnProcess.disabled = true;
    btnFileSelect.disabled = false;
    nolongerprocess(true, true);
  }

  function startProcessingFiles(evt) {
    if (ed2khasher.isbusy()) {
      nolongerprocess(true, false);
      return;
    }

    if (!(files[0])) {
      console.log('process_files: no file to process, this should never happen');
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
    select_status.textContent = 'No files selected.';
    btnFileSelectReal.value = '' // stupid chrome bug
    btnProcess.disabled = true
    btnSave.disabled = false
    nolongerprocess(false, false)
    filesEnd() // mvg change
  }

  function nolongerprocess(kill_active, progressbar) {
    if (kill_active)
      ed2khasher.terminate();
    btnFileSelect.disabled = false;
    btnProcess.textContent = 'Process';
    if (progressbar) {
      select_pfile.value = 0;
      select_pfiles.value = 0;
      select_status.textContent = 'No files selected.';
    }
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
  btnFileSelect.addEventListener('click', function() {
    btnFileSelectReal.click()
  }, false);
  btnReset.addEventListener('click', resetEverything, false);
  btnProcess.addEventListener('click', startProcessingFiles, false);
  btnSave.addEventListener('click', function() {
    resetEverything(null)
    alert('saving is not currently implemented')
  }, false);
  nolongerprocess(false, true)
})()
