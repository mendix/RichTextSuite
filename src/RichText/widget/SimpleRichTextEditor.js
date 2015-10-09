/** 
	Wysiwyg Rich Text Editor
	========================
	
	@author    : Michel Weststrate, Mendix Community
	@date      : 20-1-2012
	@copyright : Mendix
	
*/

dojo.provide("RichText.widget.SimpleRichTextEditor");

dojo.require( "dijit._Templated" );
dojo.require( "RichText.widget.lib.tiny_mce.tiny_mce", true );


RichText.widget.SimpleRichTextEditorPrototype = ( function( dojo, mendix, mx, RichText, tinymce, logger ){
	
	return {
		addons: [dijit._Templated],
		inputargs: {
			name: "", //the attribute to edit
			height: 350,
			previewwidth: 0,
			previewheight: 0,
			resizable: true,
			statusbar: false,
			defaultstyles: "", //css file to use styles from
			usetemplating: false,
			useIce: false,
			entity: "", //the templating entity
			imageentity: "",
			imageconstraint: "",
			imageform: "", //the microflow that opens the image upload form
			functionNames: "",
			button_set: "", //preconfigured button set
			onchangeMF: "",
			onleaveMF: "",
			enablespellcheck: false,
			language: "en",
			btn_undo_redo: 0, //btn configuration. All default to zero. 
			btn_cut_copy_paste: 0,
			btn_pastetext_pasteword: 0,
			btn_search_replace: 0,
			btn_mxlink_unlink: 0,
			btn_mximage: 0,
			btn_mxattribute: 0,
			btn_cleanup: 0,
			btn_fullscreen: 0,
			btn_mxpreview: 0,
			btn_styleselect: 0,
			btn_formatselect: 0,
			btn_fontselect_fontsizeselect: 0,
			btn_bold_italic_underline_strikethrough: 0,
			btn_forecolor_backcolor: 0,
			btn_bullist_numlist: 0,
			btn_outdent_indent: 0,
			btn_justifyleft_justifycenter_justifyright_justifyfull: 0,
			btn_tablecontrols: 0,
			btn_hr: 0,
			btn_styleprops: 0,
			btn_removeformat: 0,
			btn_visualaid: 0,
			btn_code: 0,
			btn_charmap: 0, 
			ice_togglechanges: 0,
			ice_toggleshowchanges: 0, 
			ice_acceptall: 0,
			ice_rejectall: 0,
			ice_accept: 0,
			ice_reject: 0
		},
	
		//hardcoded settings and other properties
		templatePath: dojo.moduleUrl("RichText", "widget/templates/RichTextEditor.html"),
		imagelimit: 3, //nummer of images per page in image browser
		initialized: 0, //1 = tinymce ready, 2 = this widget ready
		_value: "", //value cache
	
		xas: {
			dataobject: "",
			//returns an xpath constraint where property 'attr' needs to contain 'search'
			getSearchConstraint: function (attr, search) {
				if(dojo.isString(search) && dojo.isString(attr) && attr !== "") {
					return "[contains(" + attr + ", '" + escape(search) + "')]";
				}
				return "";
			},
	
			//invokes callback with the number of items matching query
			getCount: function (query, callback) {
				query = query.replace(/\[\%CurrentObject\%\]/gi, this.dataobject);
				if (mx.data) { //Mx 4.0
					mx.data.sizeOfXPathSet({
						xpath : query, 
						callback : callback, 
						resulttype : "integer"
					});
				}
				else {
					mx.processor.sizeOfXPathSet(query, callback, "integer");
				}
			},
	
			//retrieve objects by query. offset default to zero, limit defaults to one. 
			getObjects: function (query, callback, offset, limit) {
				query = query.replace(/\[\%CurrentObject\%\]/gi, this.dataobject);
				mx.processor.getObjectsByXPath(
				query, {
					offset: offset || 0,
					limit: limit || 1
				},
				callback,
				true);
			},
	
			//returns the attributes of the templating entity
			getEntityAttrs: function (entity, callback) {
				mx.metadata.getMetaEntity({
					className: entity,
					callback: callback
				});
			}
		},
	
		util: {
			//changes the content 
			setIFrameContent: function (iframe, text) {
				if(dojo.isIE) {
					iframe.contentWindow.document.write(text);
				} else {
					iframe.contentDocument.write(text); //IE hack. Again...		
				}
			},
	
			getBasePath: function () {
				var b = tinymce.baseURI;
				return b.protocol + "://" + b.authority + b.relative;
			}
		},
	
		//Object that takes care of all preview related functionality
		preview: function (editor) {
			var
			_previews = null,
				_previewa = null,
				_forcedsimplepreview = false,
				_previewObject = null,
				_popup = null,
				_metaobject = null,
				_examplecallback = null,
				_emptyIFrame = '<iframe frameborder="0" src="javascript:&quot;&quot;" id="RichTextEditorPreviewIframe" style="width: 100%; height: 100%;"></iframe>',
				_txtNothingFound = '<p style="text-align: center;color:#555555;font-family:Arial,Verdana;font-size:12px;"><br/>(No example data found)</p>';
	
			//returns the CSS styles required to show richtext created by this editor
			var getContentCss = function () {
				return "" + dojo.moduleUrl("RichText") + "widget/styles/contents.css," + dojo.moduleUrl("RichText") + "widget/styles/editor_contents.css" + (editor.defaultstyles === "" ? "" : ("," + editor.defaultstyles));
			};
	
			//wraps some html in a documentbody, withproper base path, css includes and style classes, 
			//so the code can be displayed correctly in an IFrame
			var previewToDocument = function (content) {
				var s = '<base href="' + editor.util.getBasePath() + '">'; //fixes image location problems
				var css = getContentCss().split(",");
				for(var i = 0; i < css.length; i++) {
					s += '<link type="text/css" rel="stylesheet" href="' + editor.util.getBasePath() + css[i] + '"/>';
				}
				s += '<div class="mceContentBody">' + content + '</div>';
				return s;
			};
	
			//performs a simple preview, without object substitution. 
			var simplePreview = function () {
				if(_previews === null) {
					_previews = new RichText.widget.RichTextViewer({
						width: 0,
						height: 0,
						stylesheet: editor.defaultstyles,
						richtextattr: editor.name
					}, editor.previewNode);
	
					_previews.onUpdated = function () {
						//create a iframe and set its content
						editor.mce.setPopupContent(_popup.id, _emptyIFrame);
						editor.util.setIFrameContent(dojo.byId("RichTextEditorPreviewIframe"), previewToDocument(_previews.domNode.innerHTML));
					};
				}
				_previews.renderRichText(editor._getValueAttr());
			};
	
			//returns the number of items matching the search constraint. 
			var getExampleCount = function (callback, attr, search) {
				editor.xas.getCount("//" + editor.entity + editor.xas.getSearchConstraint(attr, search), callback);
			};
	
			//function will be invoked when example data is received. 
			//uses the stored _examplecallback as example
			var receivedExample = function (data) {
				if(data.length === 0) {
					_examplecallback(_txtNothingFound); //use store
				} else {
					_previewa.clearCache(); //empty the cache
					_previewa.statictemplate = editor._getValueAttr();
					_previewa.receivedContext(data[0]);
				}
			};
	
			//loads the proper example entity
			var loadExampleEntity = function (attr, search, offset, callback) {
				_examplecallback = callback; //store the callback
				editor.xas.getObjects("//" + editor.entity + editor.xas.getSearchConstraint(attr, search),
				dojo.hitch(this, receivedExample), offset, 1);
			};
	
			//sets up for an advanced preview, based on an instance of the exmple entity
			var advancedPreview = function () {
				if(_previewa === null) {
					_previewa = new RichText.widget.AdvancedRichTextViewer({
						width: 0,
						height: 0,
						stylesheet: editor.defaultstyles,
						templatesource: "statictemplate",
						functionNames: editor.functionNames
					}, this.previewNode);
	
					//the onupdated uses the stored examplecallback
					_previewa.onUpdated = dojo.hitch(this, function () {
						var text = previewToDocument(_previewa.domNode.innerHTML);
						_examplecallback(text);
					});
				}
			};
	
			//Executes the preview functionality. 
			var preview = function () {
				delete _popup; //remove old ref
				var adv = editor.usetemplating && !_forcedsimplepreview;
				var settings = {
					title: "Template preview",
					width: adv ? Math.max(600, editor.previewwidth) : editor.previewwidth,
					height: editor.previewheight + 100,
					resizable: "yes",
					close_previous: "yes"
				};
				if(adv) {
					settings.file = dojo.moduleUrl("RichText") + "widget/templates/previewbrowser.html";
				}
				_popup = editor.mce.openPopup(settings);
	
				try {
					if(adv) {
						advancedPreview();
					} else {
						simplePreview();
					}
				} catch(err) {
					logger.warn("Unable to preview template: " + err);
					editor.mce.setPopupContent(_popup.id, "Unable to preview template: " + err);
				}
			};
	
			var uninitialize = function () {
				if(this._previewa !== null) {
					this._previewa.destroyRecursive();
				}
				if(this._previews !== null) {
					this._previews.destroyRecursive();
				}
			};
	
			//Published Methods
			return {
				preview: preview,
				uninitialize: uninitialize,
				getExampleCount: getExampleCount,
				loadExampleEntity: loadExampleEntity,
				getContentCss: getContentCss
			};
		},
	
		//image and link insert and manipulation related functions
		pluginsupport: function (editor) {
			var getImagePrefix = function () {
				return "../../../../../file?fileID=";
			};
	
			var getImageLink = function (fileid, thumb) {
				if(thumb === null) {
					thumb = false;
				}
				return this.getImagePrefix() + fileid + "&thumb=" + thumb;
			};
	
			var openBrowser = function (file, title, width, height) {
				var popup = editor.mce.openPopup({
					file: dojo.moduleUrl("RichText") + file,
					title: title,
					resizable: "yes",
					close_previous: "yes",
					popup_css: false,
					width: width,
					height: height
				}, {
					selection: editor.mce.editor.selection.getNode()
				});
			};
	
			//ed refers to the tinymce editor
			var openLinkBrowser = function () {
				
				var ed = editor.mce.editor;
				//No selection and not in link
				if(ed.selection.isCollapsed() && !ed.dom.getParent(ed.selection.getNode(), "A")) {
					return;
				}
				openBrowser("widget/templates/linkbrowser.html", "Insert Link", 350, 290);
			};
	
			var openImageBrowser = function () {
				var ed = editor.mce.editor;
				if(ed.dom.getAttrib(ed.selection.getNode(), "class").indexOf("mceItem") != -1) {
					return;
				}
				openBrowser("widget/templates/filebrowser.html", "Insert Image", 763, 390);
	
				//set Popup z-index, TODO: should be done using MxWindow, otherwise image window will appear behind a popup window with rich text editor
				//dojo.style(dojo.byId(popup.id), { 'zIndex' : '50' });
			};
	
			var openUploadImageForm = function () {
				if(editor.imageform === "") {
					//actually a microflow!
					logger.warn("No upload form specified");
				} else {
					mx.processor.xasAction({
						error: function () {
							logger.error(this.id + "error: XAS error executing microflow");
						},
						actionname: editor.imageform,
						applyto: "selection",
						guids: editor.xas.dataobject === null ? [] : [editor.xas.dataobject]
					});
				}
			};
	
			var getImagesEnabled = function () {
				return editor.imageentity !== "";
			};
	
			var getImageCount = function (callback, search) {
				editor.xas.getCount("//" + editor.imageentity + editor.imageconstraint + editor.xas.getSearchConstraint("Name", search), callback);
			};
	
			var retrieveImages = function (callback, offset, search) {
				editor.xas.getObjects("//" + editor.imageentity + editor.imageconstraint + editor.xas.getSearchConstraint("Name", search),
				callback, offset || 0, editor.imagelimit);
			};
	
			//insert attribute of an meta object
			var insertAttribute = function (attr) {
				if(attr !== "" && attr !== null) {
	
					this.mce.editor.selection.setContent('<span class="metaattribute">${' + attr + '}</span> ');
	
				}
			};
	
			var receiveMetaData = function (metaobject) {
				dojo.forEach(metaobject.getAttributesWithoutReferences(), function (attr) {
					this.attributes[attr] = metaobject.getAttributeClass(attr);
				}, this);
			};
	
			var loadAttributes = function () {
				editor.xas.getEntityAttrs(editor.entity, dojo.hitch(this, receiveMetaData));
			};
	
			return {
				getImagePrefix: getImagePrefix,
				getImageLink: getImageLink,
				openLinkBrowser: openLinkBrowser,
				openImageBrowser: openImageBrowser,
				openUploadImageForm: openUploadImageForm,
				getImagesEnabled: getImagesEnabled,
				getImageCount: getImageCount,
				retrieveImages: retrieveImages,
				insertAttribute: insertAttribute,
				loadAttributes: loadAttributes,
				attributes: {}
			};
		},
	
		//TINYMCE PLUGINS PROVIDED BY THIS EDITOR
		plugins: {
			//MENDIX COMMON PLUGIN
			loadMendixCommonPlugin: function () {
				if(!tinymce.PluginManager.get("mendixcommon")) {
					tinymce.create("mendix.mceplugins.mendixcommon", {
						init: function (ed, url) {
							var editor = ed.getParam("richtext_editor");

							// Register commands
							ed.addCommand("mxInsertImage", dojo.hitch(editor.pluginsupport, editor.pluginsupport.openImageBrowser));
							ed.addCommand("mxInsertLink", dojo.hitch(editor.pluginsupport, editor.pluginsupport.openLinkBrowser));
							ed.addCommand("mxPreview", dojo.hitch(editor.preview, editor.preview.preview));
							ed.addButton("mxpreview", {
								title: "Preview your Rich Text in a popup",
								cmd: "mxPreview"
							});
							// Register buttons
							ed.addButton("mximage", {
								title: "Insert or upload image",
								cmd: "mxInsertImage"
							});
							ed.addButton("mxlink", {
								title: "Insert a link to a web page or microflow",
								cmd: "mxInsertLink"
							});
						}
					});
					// Register plugin with a short name
					tinymce.PluginManager.add("mendixcommon", mendix.mceplugins.mendixcommon);
				}
			},
	
			//MENDIX TEMPLATING PLUGIN
			loadMendixTemplatePlugin: function () {
				if(!tinymce.PluginManager.get("mendixtemplating")) {
					tinymce.create("mendix.mceplugins.mendixtemplating", {
						init: function (ed, url) {
							var editor = ed.getParam("richtext_editor");
							editor.pluginsupport.loadAttributes();
						},
	
						createControl: function (n, cm) {
							var editor = cm.editor.getParam("richtext_editor");
							switch(n) {
								case "mxattribute":
									var b = this._attrsdropdown = cm.createSplitButton("mxattribute", {
										title: "Insert Domain Object Attribute",
										onclick: function () { //Nothing, on purpose..
										}
									});
									b.onRenderMenu.add(dojo.hitch(this, function (editor, c, m) {
										for(var attr in editor.pluginsupport.attributes) {
											m.add({
												title: attr + " (" + editor.pluginsupport.attributes[attr] + ")",
												onclick: dojo.hitch(editor, editor.pluginsupport.insertAttribute, attr)
											});
										}
									}, editor));
									return b;
									break;
								default: break;
							}
							return null;
						}
					});
					// Register plugin with a short name
					tinymce.PluginManager.add("mendixtemplating", mendix.mceplugins.mendixtemplating);
				}
			}
		},
	
		//This namespace takes care of interaction with the tinymce editor, 
		//which is accessable with mce.editor (outside), or this.editor (inside). 
		mce: function (editor) {
			this.editor = null;
			if (this.iceAttribute == '' || this.iceAttribute == null) {
				this.iceAttribute = 'Unknown User';
			}


			//This function starts the TinyMCE Editor. 
			//There are  lots of hacks in here, since tinymce has some real trouble loading into an already loaded page...
			var initMCE = function () {
				console.log(editor)
				//MWE: XXX why the different paths? no idea whatever. Tested and this combination seems to work most reliable...
				tinymce.baseURL = editor.util.getBasePath() + "widgets/RichText/widget/lib/tiny_mce";
				//HACK this path needs to be set as well to load the advanced theme:
				tinymce.baseURI.setPath(dojo.moduleUrl("RichText") + "widget/lib/tiny_mce");
	
				editor.plugins.loadMendixCommonPlugin();
				if(editor.usetemplating) {
					editor.plugins.loadMendixTemplatePlugin();
				}


				var settings = dojo.mixin({
					theme: "advanced",
					height: editor.height === 0 ? "auto" : (editor.height - 8) + "px",
					width: "100%", //MWE: -8 offset is needed for the borders
					//MWE: 18-11-11: Not sure whether this one is need or not since tinymce 3.4.7
					//document_base_url : editor.util.getBasePath(),
					relative_urls: true,
					convert_urls: true,
					theme_advanced_toolbar_location: "top",
					theme_advanced_toolbar_align: "left",
					theme_advanced_statusbar_location: editor.statusbar ? "bottom" : "none",
					theme_advanced_resizing: editor.resizable,
					richtext_editor: editor,
					language: editor.language,
					editor_css: dojo.moduleUrl("RichText") + "widget/styles/richtexteditor.css",
					content_css: editor.preview.getContentCss(),
					plugins: (editor.usetemplating ? "-mendixtemplating," : "") + "-mendixcommon,safari,pagebreak,style,table,advhr,inlinepopups,searchreplace,paste,fullscreen" + (editor.useIce ? ",ice" : ""), //BRAMUS: ,bramus_cssextras",					
					ice: {
			          user: { name: mx.session.getUserName()/*FIXME IN FUTURE: attribute can't be used, really annoying.*/, id: 1},
			          preserveOnPaste: 'p,a[href],i,em,strong',
			        },
					gecko_spellcheck: editor.enablespellcheck, //#11144
					//callbacks
					remove_instance_callback: dojo.hitch(editor, editor.processChange)
					//handle_event_callback  : dojo.hitch(editor, editor.handleGeneralEvent)
				}, generateButtons());
				// Fix for #11654: settings must be reapplied in resume.
				editor.savedSettings = settings;
				//Yet another hack to fix stuff since the document.onload will not be triggered:
				tinymce.EditorManager.settings = settings;
				this.editor = new tinymce.Editor(editor.textareaNode.id, settings);
	
				this.editor.onInit.add(dojo.hitch(editor, function () {
					this.initialized += 1; //should result in 2.
					this._setValueAttr(editor._value); //this updates the editor as well
				}))
	
				this.editor.onChange.add(dojo.hitch(editor, editor.processChange));
				//IE 7 workaround: IFrame gets unloaded before onchange is triggered, so trigger onchange on the onblur
				this.editor.onPostRender.add(function (ed) {
					var iframeNode = ed.getWin();
					dojo.connect(iframeNode, "onblur", dojo.hitch(editor, editor.handleBlur));
				});
	
	
				//HACK to get things done in Ajax environment
				//see: http://tinymce.moxiecode.com/punbb/viewtopic.php?pid=57565
				tinymce.dom.Event.domLoaded = "true";
	
				//IE wont render first time correctly, hardcoded extra delay seems to solve the issue in most cases.
				setTimeout(dojo.hitch(this, function () {
					this.editor.render(1);
				}), (dojo.isIE ? 1000 : 100));
	
			};
	
			//extracts proper toolbar strings based on the modeler configuration
			var generateButtons = function () {
				var key, item, res = {}, tools = {
					buttons1: [],
					buttons2: [],
					buttons3: [],
					buttons4: []
				};
				//strip btn_prefix and put in the proper array
				for(key in editor) {
					if(key.indexOf("btn_") === 0 && editor[key] !== 0) {
						var val = "" + editor[key]; //string cast
						tools["buttons" + val.charAt(0)].push({
							idx: val,
							btn: key.substring(4)
						});
					}
				}
	
				//sort the buttons according the index, and put in a single string in the proper string format
				var sortfunc = function (a, b) {
					return a.idx - b.idx;
				};
				var tb = 0; //toolbar
				for(var i = 1; i < 5; i++) {
					tools["buttons" + i] = tools["buttons" + i].sort(sortfunc);
					var prev = null,
						s = "";
					for(var j = 0, max = tools["buttons" + i].length - 1; j <= max; j++) {
						item = tools["buttons" + i][j];
						if(prev !== null && item.idx - prev > 1) {
							s += "|,";
						}
						s += item.btn.split("_").join(",") + (j < max ? "," : "");
						prev = item.idx;
					}
	
					//build the response, and remove empty toolbars on the go. 
					if(!s.match(/^[|,]*$/)) {
						//useful buttons at all?
						res["theme_advanced_buttons" + (++tb)] = s;
					}
	
					if(!res["theme_advanced_buttons" + i]) {
						//empty toolbar
						res["theme_advanced_buttons" + i] = "";
					}
				}
				if (editor.useIce) {
						res["theme_advanced_buttons3"] += 'ice_togglechanges,ice_toggleshowchanges,iceacceptall,icerejectall,iceaccept,icereject';
				}
				//BRAMUS: res['theme_advanced_buttons1']+=",|,bramus_cssextras_classes,|,bramus_cssextras_ids";
				return res;
			};
	
			//sets the contents of a popup, by using its id. 
			var setPopupContent = function (id, contents) {
				mendix.lang.runOrDelay(function () {
					dojo.html.set(dojo.byId(id + "_content"), contents);
				}, function () {
					return dojo.byId(id + "_content") !== null;
				});
			};
	
			//opens a new tinymce popup. args will be passed to the popup, opts defines the layout of the popup. 
			//for more information see the tinyMCE documentation. 
			//returns a handle, which id can be passed to setPopupContent
			var openPopup = function (opts, args) {
				return tinymce.activeEditor.windowManager.open(dojo.mixin(opts, {
					inline: "yes"
				}), dojo.mixin(args || {}, {
					editor: editor,
					//pass dojo along, avoids loading and initializing dojo in another document, 
					//note that this introduces additional complexity, since dojo will perform its operations
					//by default in the wrong document (and not all dojo operations have a document parameter)
					dojo: dojo
				}));
			};
	
			var uninitialize = function () {
				if(typeof tinymce != "undefined") {
					if(this.editor && this.editor.getDoc() !== null && this.editor.isDirty()) {
						editor.processChange();
					}
					tinymce.remove(this.editor);
				}
				delete this.editor;
			};
	
			//published methos
			return {
				initMCE: initMCE,
				uninitialize: uninitialize,
				openPopup: openPopup,
				setPopupContent: setPopupContent
			};
		},
	
	
		//stub function, will be used or replaced by the client environment
		onChange: function () {},
	
		_onChangeRunning: false,
	
		//tiny_mce onchange handler
		processChange: function () {
			if(this.mce.editor) { //not removed yet?
				var val = this.mce.editor.getContent();
				if(val != this._value) {
					this._value = val;
					this.onChange();
	
					//after a small amount of time, trigger the onchangeMF
					var self = this;
					//setTimeout(function() {
					if(!self._onChangeRunning && self.onchangeMF) {
						self._onChangeRunning = true;
	
	
						mx.processor.xasAction({
							error: function () {
								logger.error(self.id + "error: XAS error executing microflow");
								self._onChangeRunning = false;
							},
							callback: function () {
								self._onChangeRunning = false;
								//move selection to the end
								if(dojo.isWebKit) {
									self.mce.editor.selection.collapse(false);
								}
							},
							actionname: self.onchangeMF,
							applyto: "selection",
							guids: self.xas.dataobject === null ? [] : [self.xas.dataobject]
						});
					}
					//});
				}
			}
		},
	
		handleBlur: function () {
			this.processChange();
			if(this.onleaveMF) {
				var self = this;
				mx.processor.xasAction({
					error: function () {
						logger.error(self.id + "error: XAS error executing microflow");
					},
					callback: function () {
						//move selection to the end
						self.mce.editor.selection.collapse(false);
					},
					actionname: self.onleaveMF,
					applyto: "selection",
					guids: self.xas.dataobject === null ? [] : [self.xas.dataobject]
				});
			}
		},
	
		//returns the value of this widget
		_getValueAttr: function () {
			logger.debug(this.id + ".attr( 'value' )");
	
			if(this.initialized == 2) {
				//mce editor  might be removed in the meantime
				if(this.mce.editor) {
					var origvalue = this._value;
					this._value = this.mce.editor.getContent();
					if(origvalue != this._value) {
						//solves ticket #6803 and #6804 somehow...
						this.onChange();
					}
				}
			} else {
				logger.warn(this.id + " WYSIWIG editor was not initialized, using the fallback textarea");
				this._value = this.textareaNode.value;
			}
			return this._value;
		},
	
		//provides th value of this widget
		_setValueAttr: function (value) {
			if(this.uninitializing || this._value == value) {
	
				return;
	
			}
			this._value = value;
			if(this.initialized == 2) {
				this.mce.editor.setContent(value);
			} else {
				this.textareaNode.value = this._value;
			}
		},
	
		_setDisabledAttr: function (value) {
			//Read only not supported	
		},
	
		//constructor
		postCreate: function () {
			//		debugger;
			logger.debug(this.id + ".postCreate", this.domNode);

			this.actRendered();
		},
	
		suspendedState: false,
	
		suspended: function () {
			logger.debug(this.id + ".suspended");
			try {
				if(this.initialized == 2) {
					tinymce.execCommand("mceRemoveControl", false, this.textareaNode.id);
				}
			} catch(e) {
				logger.warn(this.id + "Error on suspend: " + e);
			}
		},
	
		resumed: function () {
			logger.debug(this.id + ".resumed");
			if(this.initialized == 2) {
				// Fix for #11654: settings must be reapplied in resume.
				tinymce.settings = this.savedSettings;
				tinymce.execCommand("mceAddControl", false, this.textareaNode.id);
				this.mce.editor = tinymce.EditorManager.get(this.textareaNode.id);
				if(this.mce.editor === null) {
					throw new Error("Unable to resume richtext editor, please reload");
				}
			}
			this.suspendedState = false;
		},
	
		//destructor
		uninitializing: false,
		uninitialize: function () {
			try {
				this.uninitializing = true;
				this.preview.uninitialize();
				this.mce.uninitialize();
			} catch(e) {
				logger.warn(this.id + "Error on uninitialize: " + e);
			}
		},
	
		applyContext: function (context, callback) {
			logger.debug(this.id + ".applyContext");
	
			if(context) {
				this.xas.dataobject = context.getTrackID();
			} else {
				this.xas.dataobject = "";
			}
	
			if(!this.suspendedState && this.initialized === 0) {
				//if suspended = true, but not initialized, we are still starting up. If suspended is false, we are visible. 
				this.loadTheEditor();
			}
	
			callback && callback();
		},
	
		loadTheEditor: function () {
			dojo.style(this.domNode, {
				height: this.height === 0 ? "auto" : this.height + "px"
			});
	
			this.applyDefaultButtonSets();
	
			this.textareaNode.id = this.id + "_textarea";
	
			//force buttons to zero if templating is not enabled
			if(this.defaultstyles === "") {
				this.btn_styleselect = 0;
			}
	
			if(!this.usetemplating || this.entity === "") {
				this.btn_mxattribute = 0;
			}
	
			if(this.previewheight === 0 || this.previewwidth === 0) {
				this.btn_mxpreview = 0;
			}
	
			this.preview = this.preview(this);
			this.pluginsupport = this.pluginsupport(this);
			this.mce = this.mce(this);
	
			if(typeof jQuery == 'undefined') {
				dojo.require("RichText.widget.lib.jquery");
			}

			mendix.lang.runOrDelay(dojo.hitch(this.mce, this.mce.initMCE), function () {
				return typeof tinymce != "undefined" && typeof tinymce != "undefined";
			});
	
			this.initialized += 1; //should result in 1.     
		},
	
		//the toolbar configuration of the predefined button sets
		applyDefaultButtonSets: function () {
			var btns;
	
			switch(this.button_set) {
			case "simple":
				btns = {
					btn_mxlink_unlink: 108,
					btn_styleselect: 101,
					btn_formatselect: 102,
					btn_bold_italic_underline_strikethrough: 104,
					btn_bullist_numlist: 106
				};
				break;
			case "stylist":
				btns = {
					btn_cut_copy_paste: 105,
					btn_mxlink_unlink: 107,
					btn_mximage: 108,
					btn_fullscreen: 110,
					btn_mxpreview: 111,
					btn_styleselect: 101,
					btn_formatselect: 102,
					btn_fontselect_fontsizeselect: 103,
					btn_bold_italic_underline_strikethrough: 203,
					btn_forecolor_backcolor: 208,
					btn_bullist_numlist: 205,
					btn_outdent_indent: 206,
					btn_justifyleft_justifycenter_justifyright_justifyfull: 201
				};
				break;
			case "advanced":
				btns = {
					btn_undo_redo: 101, //btn configuration. All default to zero. 
					btn_cut_copy_paste: 103,
					btn_pastetext_pasteword: 104,
					btn_search_replace: 106,
					btn_mxlink_unlink: 108,
					btn_mximage: 109,
					btn_mxattribute: 110,
					btn_cleanup: 112,
					btn_fullscreen: 113,
					btn_mxpreview: 114,
					btn_styleselect: 201,
					btn_formatselect: 202,
					btn_fontselect_fontsizeselect: 203,
					btn_bold_italic_underline_strikethrough: 204,
					btn_forecolor_backcolor: 206,
					btn_bullist_numlist: 301,
					btn_outdent_indent: 303,
					btn_justifyleft_justifycenter_justifyright_justifyfull: 305,
					btn_tablecontrols: 306
				};
				break;
			case "all":
				btns = {
					btn_undo_redo: 101, //btn configuration. All default to zero. 
					btn_cut_copy_paste: 103,
					btn_pastetext_pasteword: 104,
					btn_search_replace: 106,
					btn_mxlink_unlink: 108,
					btn_mximage: 109,
					btn_mxattribute: 110,
					btn_cleanup: 112,
					btn_fullscreen: 113,
					btn_mxpreview: 114,
					btn_styleselect: 201,
					btn_formatselect: 202,
					btn_fontselect_fontsizeselect: 203,
					btn_bold_italic_underline_strikethrough: 204,
					btn_forecolor_backcolor: 206,
					btn_bullist_numlist: 301,
					btn_outdent_indent: 303,
					btn_justifyleft_justifycenter_justifyright_justifyfull: 305,
					btn_tablecontrols: 306,
					btn_hr: 309,
					btn_styleprops: 116,
					btn_removeformat: 117,
					btn_visualaid: 307,
					btn_code: 118,
					btn_charmap: 310
				};
				break;
			default:
				break;
			}

			if(this.useIce) {
				btns.ice_togglechanges = "ice_togglechanges";
				btns.ice_toggleshowchanges = "ice_toggleshowchanges";
				btns.ice_acceptall = "iceacceptall";
				btns.ice_rejectall = "icerejectall";
				btns.ice_accept = "iceaccept";
				btns.ice_reject = "icereject";
			}

			for(var key in btns) {
				this[key] = btns[key];
			}
		}
	};
	
})( dojo, mendix, mx, RichText, tinymce, logger );

mendix.widget.declare( "RichText.widget.SimpleRichTextEditor", RichText.widget.SimpleRichTextEditorPrototype );