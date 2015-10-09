/** 
	Advanced Rich Text Viewer
	========================
	
	@file 		 : AdvancedRichTextViewer.js
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

dojo.provide("RichText.widget.AdvancedRichTextViewer");

//Note that due to a limitation in insertCss, the css might be loaded twice (richtextviewer will load the css as well). 
mendix.dom.insertCss(mx.moduleUrl('RichText') + 'widget/styles/contents.css');

mendix.widget.declare('RichText.widget.AdvancedRichTextViewer', {
	addons       : [mendix.addon._Contextable] ,
  inputargs: { 
		width     : 120,
		height    : 120,
		stylesheet: '',
		
		templatesource : '',
		templatefile   : false,
		templatefileprefix : '',
		templatefilepostfix: '',
		statictemplate: '',
		templateentity: '',
		templateentityattribute: '',
		templateconstraint: '',
		templatesortattr : '',
		templatemicroflow: '',
		templateattribute : '',
		
		functionNames : '',
		functionMicroflows : '',
		alwaystrigger : false,
		alwaystriggermicroflow : ''
  },

	onUpdated : null,
	templateCache : null, 
	attrCache : null,
	
	//Empty all caches
	clearCache : function() {
		this.templateCache = null;
		this.attrCache = null;
	},
	
	//Invokes the proper microflow, when a link is clicked. 
	invokecallback : function(idx) {
		if (idx >= this.functionNames.length) {
			logger.error(this.id + " Microflow index out of range: " + idx);
			return;
		}
		if (idx >= this.functionMicroflows.length)
			alert('Microflow function \''+this.functionNames[idx]+'\' triggered. (but no Microflow was specified)');
		else
			mx.processor.xasAction({
				error       : function() {
					logger.error(this.id + "error: XAS error executing microflow");
				},
				actionname  : (idx >= 0 ? this.functionMicroflows[idx] : this.alwaystriggermicroflow),
				applyto     : 'selection',
				guids       : [this.dataobject.getGUID()]
			});
	},

	//replaces all '${key}' in template with props.key if props.key exists. Case insensitive
	substitute : function(template, props) {
		for(key in props) {
			template = template.replace(new RegExp("\\$\\{"+key+"\\}","gi"), props[key]);
		}
		return template;
	},
	
	//sets the contents of this widget to the application of the current context object to 
	//the template in the templateCache property. 
	applyTemplate : function() {
		var res = '';
		if (this.attrCache == null) {
			this.attrCache = {};
			//generate all callbacks
			for(var i = 0; i < this.functionNames.length; i++) 
				if (dojo.isString(this.functionNames[i]))	
					this.attrCache[this.functionNames[i]] = this.substitute("typeof(dijit) != &quot;undefined&quot; && dijit.byId(&quot;${id}&quot;).invokecallback(${idx})", { id  : this.id, idx : i });
		}
		
		//add all attributes
		dojo.forEach(this.dataobject.getAttributesWithoutReferences(), dojo.hitch(this,function(attribute) {
			this.attrCache[attribute] = mendix.html.renderValue(this.dataobject, attribute) || ""; //always overwrite previous val
		}));
		
		try {
			res = this.substitute(this.templateCache, this.attrCache);
		}
		catch (error) {
			logger.error("Unable to apply template: " + error); 
			res = "&lt;unable to render&gt;";
		}				
		dojo.html.set(this.domNode, res, { parseContent : false }); 
		if (dojo.isFunction(this.onUpdated))
			this.onUpdated();			
	},
	
	//the template has been found! what to do? if its a filename, retrieve the file, 
	//otherwise, apply the template. 
	receivedTemplateSource : function(template) {
		if (template == null) 
			logger.error(this.id + " received null template, please check your configuration");
		else {
			if (this.templatefile === false) {
				this.templateCache = template;
				this.applyTemplate();
			}
			else {
				logger.info(this.id + " Fetching template " + this.templatefileprefix + template + this.templatefilepostfix);
				dojo.xhrGet({
					url : this.templatefileprefix + template + this.templatefilepostfix, 
					load : dojo.hitch(this, function(response, ioArgs) {
						this.templateCache = response;
						this.applyTemplate();
						return response;
					}),
					error: dojo.hitch(this, function(response, ioArgs) {
						logger.error(this.id + " Error while fetching template: "+ response);
						return response;
					})
				});
			}
		}
	},
	
	//if the 2) domain entity is received, retrieve its template attribute and apply the template
	receivedDomainEntity : function(data) {
		if (data.length != 1)
			logger.error(this.id + " received Domain Entity did not receive exactly 1 domain object");
		else 
			this.receivedTemplateSource(data[0].getAttribute(this.templateentityattribute));
	},
	
	//if source type is 2) Domain Entity, retrieve the entity
	retrieveDomainEntity : function() {
		if (this.templateentity == '' || this.templateentityattribute == '')
			logger.error(this.id + " Template Source was set to domain entity, but either Template Entity or Template Entity Attribute were not defined.");
		mx.processor.getObjectsByXPath(
				"//" + this.templateentity + this.templateconstraint,
				{ 
					sort : this.templatesortattr == '' ? [] : [[this.templatesortattr, "asc"]],
					limit : 1
				},
				dojo.hitch(this, this.receivedDomainEntity), 
				true //use cache
		);
	},
	
	//when the 3) microflow response is received, apply the template
	receivedMicroflowTemplate : function(data) {
		this.receivedTemplateSource(dojo.fromJson(data.xhr.responseText).actionResult);
	},
	
	//if source type is 3) Microflow, invoke the microflow
	invokeTemplateMicroflow : function() {
		if (this.templatemicroflow == '')
			logger.error(this.id + "Template Source was set to Microflow, but no microflow has been defined!");
		else
			mx.processor.xasAction({
				error       : function() { logger.error(this.id + "error: XAS error executing microflow, while invoking template microflow."); },
				actionname  : this.templatemicroflow,
				applyto     : 'selection',
				guids       : [this.dataobject.getGUID()],
				callback    : dojo.hitch(this, this.receivedMicroflowTemplate)
			});
	},
	
	//the context object is received, fetch the template
	receivedContext : function(dataobject) {
		logger.debug(this.id + ".receivedContext");
		this.dataobject = dataobject; 
		
		if (this.templateCache == null) {
			switch (this.templatesource) {
				case "statictemplate" : // 1) Static Template
					this.receivedTemplateSource(this.statictemplate);
					break;
				case "domainentity" : // 2) Domain Entity
					this.retrieveDomainEntity();
					break;
				case "microflow" : // 3) Microflow
					this.invokeTemplateMicroflow();
					break;
				case "contextentity" : // 4) Context object, the template is a property of the context object
					if (this.templateattribute == '') 
						logger.error(this.id + "Template source was set to Context Object, but no template attribute has been defined!");
					else {
						this.receivedTemplateSource(this.dataobject.getAttribute(this.templateattribute));
					}
					break;
				default:
					logger.error(this.id + "Template source was not defined!");
			}
		}
		else
			this.applyTemplate();
 	},

	//context received, fetch its object
	applyContext : function(context, callback){
		logger.debug(this.id + ".applyContext"); 
		if (context) 
			mx.processor.getObject(context.getTrackID(), dojo.hitch(this,this.receivedContext));
		callback && callback();
	},	
	
	// constructor
	postCreate : function(){
		//houskeeping
		logger.debug(this.id + ".postCreate");
		
		this.functionNames = this.functionNames == "" ? [] : this.functionNames.split(';');
		this.functionMicroflows = this.functionMicroflows == "" ? [] : this.functionMicroflows.split(';');
		
		if (this.functionNames.length != this.functionMicroflows.length)
			logger.error(this.id + " Invalid function configuration, lengths differ");
		
		if (this.stylesheet != '')
			mendix.dom.insertCss(this.stylesheet);

		dojo.attr(this.domNode, { 'class' : 'mceContentBody' }); //use class of richtext editor, to enforce similar stylings
		dojo.style(this.domNode, { 
			width: this.width == 0 ? '100%' : this.width + 'px', 
			height: this.height == 0 ? 'auto' : this.height + 'px', 
			overflow: 'hidden' 
		});
		
		if (this.alwaystrigger === true) //add onclick event if alwaystrigger is set to true
			this.connect(this.domNode, 'onclick', dojo.hitch(this,this.invokecallback, -1));
		
		this.initContext();
		this.actRendered();
	},
		
	//destructor
	uninitialize : function(){
		logger.debug(this.id + ".uninitialize");
	}
});