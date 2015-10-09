//WARNING, dojo originates from another document!
var dojo = null;
var FileBrowser = {
	editor : null, 
	contentnode : null,
	offset : 0,
	count  : 0,
	counternode : null,
	searchstr : null,
	selection : null,
	previewimg : null,
	refreshing : false,
	maxcaptionwidth : 15, //max nr of characters in the caption
	
	//setup
	init : function () {
		dojo = tinyMCEPopup.getWindowArg("dojo");
		this.editor = tinyMCEPopup.getWindowArg("editor");		
		this.selection = tinyMCEPopup.getWindowArg("selection");
		this.refresh(true);
		this.previewimg = dojo.byId("previewimg", document);
		this.loadImg();
	},
	
	//wrapper around dojo.html.set, which causes trouble when loaded into another document
	sethtml : function(node, content) {
		//empyt node first to work around http://trac.dojotoolkit.org/ticket/10095
		//dojo.html.set causes IE freeze because wrong owner document when destroying items
		if (dojo.isIE) {
			for(var c; c = node.lastChild;){ // intentional assignment
					node.removeChild(c);
			}
			node.innerHTML = "";
		}
		dojo.html.set(node, content);
	},
	
	//updates the UI according to the current image. 
	loadImg : function() {
		//show xas functionality if applicatble or select first radio btn
		var xasbrowser = this.editor.pluginsupport.getImagesEnabled();
		var f = document.forms[0];
		
		if (this.selection.nodeName == "IMG") {
			var url = dojo.attr(this.selection, 'src'); 
			f.height.value = dojo.attr(this.selection, 'height') || ""; 
			f.width.value  =  dojo.attr(this.selection, 'width') || ""; 

			if (xasbrowser && url.indexOf(this.editor.pluginsupport.getImagePrefix()) == 0) {
				f.imgtype[1].checked = true;
				f.xasurl.value  = url; 
			}
			else {//use real url
				f.imgtype[0].checked = true;
				f.url.value = url;
			}
			this.updatePreview();
		}
		if (xasbrowser)
			dojo.style(dojo.byId("xasnode", document), { display : 'block'});
		if (this.editor.imageform == '') //hide upload link
			dojo.style(dojo.byId("uploadnode", document), { display : 'none' });
	},
	
	//calculates the attributes for an IMG tag, based on the current input
	getImageAttrs : function() {
		var args = {}, f = document.forms[0];
		if (f.imgtype[1].checked)
			args.src = f.xasurl.value;
		else
			args.src = f.url.value;
			
		args.width = f.width.value;
		args.height = f.height.value;
		if (/^\s*$/.test(args.width))
			args.width = '';
		if (/^\s*$/.test(args.height))
			args.height = '';			
		return args;
	},

	//renders the preview image
	updatePreview : function() {
		var attrs = this.getImageAttrs();
		dojo.attr(this.previewimg, attrs); 
		//fixes an IE issue:
		if (attrs.height == '')
			dojo.removeAttr(this.previewimg, 'height');
		if (attrs.width == '')
			dojo.removeAttr(this.previewimg, 'width');
	},
	
	//callback, invoked when images are received from the server
	receivedImages : function(data) {
		if (data == null)
			logger.error(this.editor.id + " did not receive valid images");
		else {
			if (this.contentnode == null) 
				this.contentnode = dojo.byId("filebrowser_contents", document); 
			this.updateCount();
			this.sethtml(this.contentnode,"");
			dojo.forEach(data, dojo.hitch(this, this.renderXasImage));
		}
		this.refreshing = false;
	},
	
	//updates the counter node
	updateCount : function(count) {
		if (count != null)
			this.count = count;
		if (this.counternode == null)
			this.counternode = dojo.byId("filebrowser_counter",  document);
		this.sethtml(this.counternode, (this.offset+1) + " to " + Math.min(this.count, this.offset + this.editor.imagelimit) + " of " + this.count);
	},
	
	//apply the search query
	updateSearch : function(searchstr) {
		if (searchstr === "") //empty equals apply no filter
			searchstr = null;
		if (this.searchstr != searchstr) {
			this.searchstr = searchstr;
			this.offset = 0;
			this.refresh(true);
		}
	},
	
	//renders a single image
	renderXasImage : function(image) {
		var e   = dojo.create('div', { 'class' : 'richtextinput_imagenode' }, this.contentnode);
    var fileid = image.getAttribute('FileID');
    if (fileid == null || fileid == '')
      throw "No file ID available. Are you using Mendix 2.5.2 or higher?";
		dojo.connect(e, 'onclick', dojo.hitch(this, this.selectImage, fileid));
		var img = dojo.create('img', { src : this.editor.pluginsupport.getImageLink(fileid, true) }, e);
		var c   = dojo.create('span', {}, e);
		var n   = image.getAttribute('Name') || "";
		this.sethtml(c, (n.length > this.maxcaptionwidth ? n.substring(0, this.maxcaptionwidth-3) + "..." : n));
	},

	previous : function() {
		if (this.offset > 0) {
			this.offset -= this.editor.imagelimit;
			this.refresh();
		}
	},
	
	next : function() {
		if (this.count > this.offset + this.editor.imagelimit) {
			this.offset += this.editor.imagelimit;
			this.refresh();
		}
	},
	
	refresh : function(updatecount) {
		if (this.editor.pluginsupport.getImagesEnabled() && !this.refreshing) {
			this.refreshing = true;//one request at a time
			if (updatecount === true)
				this.editor.pluginsupport.getImageCount(dojo.hitch(this,  this.updateCount), this.searchstr);
			this.editor.pluginsupport.retrieveImages(dojo.hitch(this, this.receivedImages), this.offset, this.searchstr);
		}
	},
	
	clearsearch : function() {
		this.searchstr = null;
		dojo.byId('quicksearch',document).value='';
		this.refresh(true);
		
	},
	
	//onclick handler
	selectImage : function(fileid) {
		var URL = this.editor.pluginsupport.getImageLink(fileid, false); 
		document.forms[0].imgtype[1].checked = true;
		document.forms[0].xasurl.value = URL;
		this.updatePreview();
	},
	
	//invokes the microflow to upload an additional image
	uploadImage : function () {
		this.editor.pluginsupport.openUploadImageForm();
	},
	
	//insert the image. Based on tiny_mce/plugin/advimage/
	insertAndClose : function() {
		var mce = tinyMCE.activeEditor;

		f = document.forms[0]; 
		tinyMCEPopup.restoreSelection();
		// Fixes crash in Safari
		if (tinymce.isWebKit)
			mce.getWin().focus();

		var args = this.getImageAttrs();
		var el = this.selection;

		if (el && el.nodeName == 'IMG') {
			mce.dom.setAttribs(el, args);
		} else {
			mce.execCommand('mceInsertContent', false, '<img id="__mce_tmp" />', {skip_undo : 1});
			mce.dom.setAttribs('__mce_tmp', args);
			mce.dom.setAttrib('__mce_tmp', 'id', '');
			mce.undoManager.add();
		}

		tinyMCEPopup.close();
	}
}

tinyMCEPopup.onInit.add(FileBrowser.init, FileBrowser);