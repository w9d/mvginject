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
  var failstr = ''

  if (typeof ed2khash !== 'function')
    failstr += 'mvg-inject: we wanted to inject but we\'re missing ed2khash\n'
  if (applet_shas.indexOf(applet_sha) === -1)
    failstr += 'mvg-inject: we wanted to inject but the target element has changed\n'

  if (failstr !== '') {
    console.error(failstr)
    console.log('theApplet contents="' + applet.innerHTML + '"')
    console.log('theApplet sha256=' + applet_sha)
    window.alert(failstr)
    return
  }

  var ourCode = ['',
    '<div style="background-color:#eee;padding:0px;font-family:Tahoma,Geneva,sans-serif;text-align:left;resize:none;width:405px;height:170px">',
    '<div style="background-color:#333;width:405px;height:75px;text-align:center">',
    '<span style="color:red;font-weight:bold;font-size:0.7em;position:relative;top:5px">unofficial</span><br /><span style="font-size:2em;color:white;position:relative;top:5px">MVGroup<span style="color:#55d300">Hasher</span></span>',
    '</div>',
    '<input type="file" id="__ed2kFileSelectionReal" accept=".mkv, .mp4, .avi" style="display:none" multiple />',
    '<button id="__ed2kFileSelection" disabled="true" style="width:32%;height:25px">Open</button>',
    '<button id="__ed2kReset" disabled="true" style="width:33%;height:25px">Reset</button>',
    '<button id="__ed2kProcess" disabled="true" style="width:33%;height:25px">Process</button><br />',
    '<div id="__ed2kFileStatus" style="padding-left:2px">Script has not executed.</div><br />',
    '<progress id="__ed2kProgressFile" style="width:100%"></progress><br />',
    '<progress id="__ed2kProgressFiles" style="width:100%"></progress>',
    '</div>',
    '<textarea readOnly="readOnly" id="filehashes" name="filehashes" cols="100"',
   'rows="5" style="width:100%;"></textarea>'].join('')
  applet.innerHTML = ourCode
  console.log('mvg-inject: we\'ve injected our HTML successfully!')

  var files = [];
  //var ed2k_text = document.getElementById('filehashes'); // mvg change
  var btnReset = document.getElementById('__ed2kReset');
  var btnProcess = document.getElementById('__ed2kProcess');
  var btnFileSelectReal = document.getElementById('__ed2kFileSelectionReal');
  var btnFileSelect = document.getElementById('__ed2kFileSelection');
  var select_status = document.getElementById('__ed2kFileStatus');
  var select_pfile = document.getElementById('__ed2kProgressFile');
  var select_pfiles = document.getElementById('__ed2kProgressFiles');

  // bulk of unmodified example code
  var ed2k_progress = function (_file, _current_file, _total_files) {
    select_pfile.value = _current_file;
    select_pfiles.value = _total_files;
  }
  var ed2k_file_done = function (f, sum) {
    // mvg changes
    //ed2k_text.value += f.name + '\t' + f.size + '\t' + sum.mpc + '\t' + sum.ed2k + '\n';
    var hashes = [sum.mpc, sum.ed2k]
    fileHashed(f.name, f.size, hashes)
  }
  var ed2khasher = ed2khash();
  ed2khasher.onprogress = ed2k_progress;
  ed2khasher.onfilecomplete = ed2k_file_done;
  ed2khasher.onallcomplete = function () {
    nolongerprocess(false, false)
    filesEnd() // mvg change
  };
  ed2khasher.onerror = function (e) { window.alert('ed2khash error: ' + e.message) }
  ed2khasher.setworker(getWorker())

  function handleFileSelect(evt) {
    var _files = evt.target.files;
    var add = function(a,b){return a+b.size};

    for (var i = 0, f; f = _files[i]; i++) {
      if (!f.name.match('\.(mkv|mp4|avi)$')) {
        window.alert('We only accept the MP4, MKV and AVI multimedia containers.' +
          '\n\nYour selection "' + f.name + '" was ignored.');
        continue;
      }
      files.push(f);
    }

    if (files.length === 0)
      return

    select_status.textContent = (files.reduce(add,0)/1000000000).toPrecision(3)+
        'GB for ' + files.length + ' ' + ((files.length==1)&&'file'||'files');
    btnReset.disabled = false;
    btnProcess.disabled = false;
  }

  function resetEverything(evt) {
    files = [];
    //ed2k_text.value = ''; // mvg change
    select_status.textContent = '';
    btnFileSelect.value = '';
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
    //ed2k_text.value = ''; // mvg change
    btnFileSelect.disabled = true;
    btnProcess.textContent = 'Stop';
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

  btnFileSelectReal.addEventListener('change', handleFileSelect, false);
  btnFileSelect.addEventListener('click', function() {btnFileSelectReal.click()}, false);
  btnReset.addEventListener('click', resetEverything, false);
  btnProcess.addEventListener('click', startProcessingFiles, false);
  btnFileSelect.disabled = false;
  select_status.textContent = 'No files selected.';
})()
