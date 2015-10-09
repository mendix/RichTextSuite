var dojo = null;
var LinkBrowser = {
	editor : null, 
	mce    : null,
	contentnode : null,
	selection : null,
	mfrows : {}, 
	url  : null,
	MFregex : /^javascript:void\(\$\{(\w|\s)+\}\);$/,
	_functionNames : null,
	
	//setup
	init : function () {
		dojo = tinyMCEPopup.getWindowArg("dojo");
		this.editor = tinyMCEPopup.getWindowArg("editor");		
		this.mce = tinyMCE.activeEditor;
		this.selection = tinyMCEPopup.getWindowArg("selection");
		this._functionNames = this.editor.doesnotmatter;
		
		this.loadLink();
		this.refresh();
		this.renderSelection(this.url);
		
		if (this._functionNames != '')
			dojo.style(dojo.byId("xasnode", document), { display : 'block' });
	},
	
	//adjusts the UI according to the current url. 
	loadLink : function() {
		var f = document.forms[0];
		if (this.selection.nodeName == "A") {
			this.url = dojo.attr(this.selection, 'href'); 
			
			if (this._functionNames != '' && this.url.match(this.MFregex)) {
				f.linktype[1].checked = true;
				f.xasurl.value = this.url;
			} //non microflow url
			else {
				f.linktype[0].checked = true;
				f.url.value = this.url; 
			}
		}
	},	
	
	//retrieves the available microflows, and selects the proper one
	refresh : function() {
		if (this._functionNames == '') 
			return;
		this.mfrows = {};
		if (this.contentnode == null) 
				this.contentnode = dojo.byId("linkbrowser_contents", document); 
				
		if (this._functionNames != "") {
			if (dojo.isIE) //IE Bugfix see filebrowser.js/sethtml 
				for(var c; c = this.contentnode.lastChild;) // intentional assignment
					this.contentnode.removeChild(c);
			else
				this.contentnode.innerHTML = "";
				
			dojo.forEach(this._functionNames, dojo.hitch(this,this.createMicroflowLink));
		}
	},

	//give a microflow name, create a row in the microflow table
	createMicroflowLink : function(microflow) {
		var tr = dojo.create('li', {}, this.contentnode);
		dojo.connect(tr, 'onclick', dojo.hitch(this, this.selectMF, microflow));
//		var td = dojo.create('td', {}, tr); 
//		td.innerHTML = microflow;
		tr.innerHTML = microflow.functionNames;
		this.mfrows[this.toJS(microflow.functionNames)] = tr;
	},
	
	//onclick handler of a microflow row
	selectMF : function(microflow) {
		document.forms[0].xasurl.value = this.toJS(microflow.functionNames);
		document.forms[0].linktype[1].checked = true;
		this.renderSelection(this.toJS(microflow.functionNames));
	},
	
	//updates the classes of the microflow table based on the current selection
	renderSelection : function(url) {
		for(mf in this.mfrows) {
			dojo.attr(this.mfrows[mf], { 'class' : 'richtextinput_microflownode' });
			if (mf == url)
				dojo.attr(this.mfrows[mf], { 'class' :  'richtextinput_microflownode_selected' });
		}
	},
	
	//returnts the 'url' of a microflow
	toJS : function(microflow) {
		return "javascript:void(${"+microflow+"});";
	}, 
	
	//validates the url
	checkPrefix : function(n) {
		if (n.match(this.MFregex))
			return n; 	
		if (/^http[s]?:/i.test(n)) 
			return n;
		if (/^mailto:/i.test(n))
			return n;
		if (/^[\w.-]+@[\w.-]+$/i.test(n)) //naive regex, when intended as email, it is email
			return 'mailto:' + n;
		//fallback, we want a protocol, not somebody entering javascript:
		return 'http://' + n;
	},
	
	//get the current selected url
	getUrl : function() {
		var f = document.forms[0]; 
		var url = this.checkPrefix(f.linktype[0].checked == true ? f.url.value : f.xasurl.value);		
		return url;
	},
	
	//get the current selected url
	getTarget : function() {
		var f = document.forms[0];
		return target = f.windowTarget.checked;
	},
	
	setAllAttribs : function(elm) {
		var url = this.getUrl();

		this.setAttrib(elm, 'href', url);
		this.setAttrib(elm, 'target', 
			this.getTarget() 
			 ? url.match(this.MFregex) ? '' : '_blank'
			 : url.match(this.MFregex) ? '' : '_self'
		);

		// Refresh in old MSIE
		if (tinyMCE.isMSIE5)
			elm.outerHTML = elm.outerHTML;
	},

	setAttrib : function(elm, attrib, value) {
		var dom = tinyMCEPopup.editor.dom;

		dom.setAttrib(elm, attrib, value);
	},
	
	insertAndClose : function() {
		//MWE: Code below copied form the tiny_mce/plugin/advlink/advlink.js/insertAction()
		var inst = tinyMCEPopup.editor;
		var elm, elementArray, i;

		elm = inst.selection.getNode();

		elm = inst.dom.getParent(elm, "A");

		// Create new anchor elements
		if (elm == null) {
			inst.getDoc().execCommand("unlink", false, null);
			tinyMCEPopup.execCommand("mceInsertLink", false, "#mce_temp_url#", {skip_undo : 1});

			elementArray = tinymce.grep(inst.dom.select("a"), function(n) {return inst.dom.getAttrib(n, 'href') == '#mce_temp_url#';});
			for (i=0; i<elementArray.length; i++)
				this.setAllAttribs(elm = elementArray[i]);
		} else
			this.setAllAttribs(elm);

		// Don't move caret if selection was image
		if (elm.childNodes.length != 1 || elm.firstChild.nodeName != 'IMG') {
			inst.focus();
			inst.selection.select(elm);
			inst.selection.collapse(0);
			tinyMCEPopup.storeSelection();
		}

		tinyMCEPopup.execCommand("mceEndUndoLevel");
		tinyMCEPopup.close();
	}
};

tinyMCEPopup.onInit.add(LinkBrowser.init, LinkBrowser);