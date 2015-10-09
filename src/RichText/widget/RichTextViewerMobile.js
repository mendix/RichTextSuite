/** 
	Wysiwyg Rich Text Editor
	========================
	
	@file 		 : RichTextViewer.js
	@version	 : 0.1 (alpha)
	@author    : Michel Weststrate, Mendix Community
	@date      : 5-2-2010
	@copyright : Mendix
	@license   : Please contact our sales department. 
	
	Documentation
	=============
	see either 
	- intro.png
	- the modeler configuration 
	- or the RichTextDemo project
	
	Open Issues
	===========
	
	File is best readable with tabwidth = 2; 
*/

dojo.provide("RichText.widget.RichTextViewerMobile");

//default editor CSS
mobile.dom.addCss(mx.moduleUrl('RichText') + 'widget/styles/contents.css');

dojo.declare('RichText.widget.RichTextViewerMobile', mobile.widget._Widget, {
	height    : 120,
	useMceContentBody : true,
	stylesheet: '',
	name  		: '',
	onclickMF : '',
	maxlength : 0,
	nohtml   : false,
	functionNames : '',

	dataobject : null,
	
	truncate : function(text, length) {
		var first = text.substring(0, length);
		var second = text.substring(length);
		var i = second.indexOf(">");
		if (i < second.indexOf("<")) { //if closes before open the tag, we cutted inside a tag
			first += second.substr(0, i+1);
			second = second.substr(i+1);
		} 
		
		var secondlength = second.length;
		second = (">"+second+"<").replace(/\>[^<]*\</mg, "><"); //regex to ensure formatting is kept
		second = second.substring(1, second.length-1);
		
		return first + second + (secondlength != second.length ? "..." : "");
	},
	
	createMicroflowLinks : function(text) {
		if (text == null || text == undefined)
			return "";
		for(var i = 0; i < this._functionNames.length; i++) 
			if (dojo.isString(this._functionNames[i].functionNames))	
				text = text.replace(new RegExp("\\$\\{"+this._functionNames[i].functionNames+"\\}","gi"), "typeof(dijit) != &quot;undefined&quot; && dijit.byId(&quot;"+this.id+"&quot;).invokecallback("+i+")");
		return text;
	},
	
	removehtml : function(text) {
		return text
			.replace(/&/g,"&amp;")
			.replace(/</g,"&lt;")
			.replace(/>/g,"&gt;")
			.replace(/\r\n/g,"<br/>")
			.replace(/\n/g,"<br/>")
			.replace(/\r/g,"<br/>");
	},
	
	renderRichText : function(richtext) {
		if (this.maxlength != 0)
			richtext = this.truncate(richtext, this.maxlength);
		if (this.nohtml == true)
			richtext = this.removehtml(richtext).replace(/\n/g,"<br/>");
		richtext = this.createMicroflowLinks(richtext);
			
		mobile.dom.html(this.domNode, richtext); 
		if (dojo.isFunction(this.onUpdated))
			this.onUpdated();			
	},

	//Copied from AdvancedRichTextViewer
	invokecallback : function(idx) {
		if (idx >= this._functionNames.length) {
			logger.error(this.id + " Microflow index out of range: " + idx);
			return;
		}

			mx.processor.xasAction({
				caller: this,
				error       : function() {
					logger.error(this.id + "error: XAS error executing microflow");
				},
				actionname  : (idx >= 0 ? this.functionMicroflows[idx] : this.onclickMF),
				applyto     : 'selection',
				guids       : [this.dataobject]
			});

	},

	// HOUSEKEEPING
	postCreate : function(){
		logger.debug(this.id + ".postCreate");

		this.name = this.name; 
		this.domNode.setAttribute("name", this.name); 
		
		if (this.stylesheet != '')
			mobile.dom.addCss(this.stylesheet);
		
		if (this.useMceContentBody)
			dojo.addClass(this.domNode, 'mceContentBody'); //use class of richtext editor, to enforce similar stylings
		
		dojo.style(this.domNode, { 
			width: this.width == 0 ? '100%' : this.width + 'px', 
			height: this.height == 0 ? 'auto' : this.height + 'px', 
			overflow: this.height == 0 ? 'hidden' : 'auto'
		});
		if (this.onclickMF != '') //add onclick event 
			this.connect(this.domNode, 'onclick', dojo.hitch(this,this.invokecallback));
		
		this._functionNames = this.doesnotmatter2;
		
		this.actLoaded(function () {});
	},
	
	update : function(obj, callback){
		logger.debug(this.id + ".update"); 
		if (obj) {
			this.dataobject = obj.getGUID();
			this.getAttrib(obj, this.name);
		}
		else
			this.dataobject = null;
		callback && callback();
	},

	getAttrib : function (obj, attr) {
		var split = attr.split("/");
		if (split.length > 1) {
			mx.data.get({
				guid : obj.getReference(split[0]),
				callback : dojo.hitch(this, function (obj) {
					if (obj != null)
						this.renderRichText(obj.getAttribute(split[2]));
				})
			});
		} else
			this.renderRichText(obj.getAttribute(this.name));
	},

	uninitialize : function(){
		logger.debug(this.id + ".uninitialize");
	}
});