//WARNING, dojo originates from another document!
var dojo = null;
var PreviewBrowser = {
	editor : null, 
	contentnode : null,
	offset : 1,
	count  : 0,
	counternode : null,
	searchstr : null,
	previewimg : null,
	refreshing : false,
	
	//setup
	init : function () {
		dojo = tinyMCEPopup.getWindowArg("dojo");
		this.editor = tinyMCEPopup.getWindowArg("editor");		
		
		this.updateIFrame("Loading...");
		
		dojo.style(dojo.byId('richtextinput_previewborder', document), { 
			width: this.editor.previewwidth +"px", 
			height: this.editor.previewheight + "px"
		});
		
		//create the dropdown options
		var select = dojo.byId('previewbrowser_searchattr', document); 
		for(attr in this.editor.pluginsupport.attributes) 
			dojo.create('option', { value : attr }, select).innerHTML = attr + " ("+ this.editor.pluginsupport.attributes[attr] +")";
				
		this.refresh(true);
	},
	
	iframe : null,
	//updates the text of the inner iframe. Which is a bit tricky sometimes..
	updateIFrame : function(text) {
		if (this.iframe == null)
			this.iframe = dojo.byId('RichTextEditorPreviewIframe', document);
			
		if (dojo.isIE) {
			var node = this.iframe.contentWindow.document;
			try {
				//Dirty hack, after trying
					//1) this.iframe.src = "blank.html"; //easiest way to empty the doc. 
					//2) for(var c; c = node.lastChild;){ node.removeChild(c); 
					//3) node.documentElement.innerHTML = ..
				node.documentElement.lastChild.innerHTML = "";
				node.write(text);
			} 
			catch (err) { //IE 8 might throw an 800a03e8 exception. 
				//http://siderite.blogspot.com/2009/05/internet-explorer-8-is-driving-me-crazy.html
				//FIXME: this might cause endles looping...
				setTimeout(dojo.hitch(this, this.updateIFrame, text), 500);
			}
		}
		else
			this.iframe.contentDocument.documentElement.innerHTML = text;
	},
	
	//updates the counter contents
	updateCount : function(count) {
		if (count != null)
			this.count = count;
		if (this.counternode == null)
			this.counternode = dojo.byId("PreviewBrowser_counter",  document);
		dojo.html.set(this.counternode, this.offset + " of " + this.count);
	},
	
	//performs a (empty) search
	updateSearch : function(searchstr) {
		var attr = document.forms[0].searchattr.value;
		if (searchstr === "" || attr === "") //empty equals apply no filter
			searchstr = null;
		if (this.searchstr != searchstr) { //if search differs from current value
			this.searchattr = attr;
			this.searchstr = searchstr;
			this.offset = 1;
			this.refresh(true);
		}
	},
	
	previous : function() {
		if (this.offset > 1) {
			this.offset -= 1;
			this.refresh();
		}
	},
	
	next : function() {
		if (this.count > this.offset) {
			this.offset += 1;
			this.refresh();
		}
	},
	
	//loads an entity, based on the current search string. If updatecount, then the number of items
	//is recalcuted. 
	refresh : function(updatecount) {
		if (updatecount === true)
			this.editor.preview.getExampleCount(dojo.hitch(this, this.updateCount), this.searchattr, this.searchstr);
		else
			this.updateCount(null); //update existing count
		//load entity (convert offst to zero indexed)
		this.editor.preview.loadExampleEntity(this.searchattr, this.searchstr, this.offset -1, dojo.hitch(this, this.updateIFrame));
	},
	
	clearsearch : function() {
		this.searchstr = null;
		dojo.byId('quicksearch',document).value='';
		this.refresh(true);
	},
}

tinyMCEPopup.onInit.add(PreviewBrowser.init, PreviewBrowser);