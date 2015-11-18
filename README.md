# RichTextSuite
> **This widget is based on a legacy library and isn't actively supported. If you want to contribute to the widget, or actively maintain it, please contact us!**
>
> **Please use CKEditor widget ([AppStore](https://appstore.home.mendix.com/link/app/1715/Mendix/CKEditor-For-Mendix)/[Github](https://github.com/mendix/CKEditorForMendix)) for text editor requirements in your project.**

The Rich Text Suite provides two widgets to enable styled text in your application. The rich text editor can be used to create such texts. It supports fonts, colors, images, tables, links, microflow invocations, CSS classes, in short, everything you might expect from such editor.

The rich text viewer can be used to display rich (HTML based) text. Furthermore it is suited to render not Rich text text as well, since it does not require to predefine the number of lines, in contrast to the Mendix built-in text area.

## Contributing
For more information on contributing to this repository visit [Contributing to a GitHub repository] (https://world.mendix.com/display/howto50/Contributing+to+a+GitHub+repository)

## Typical usage scenario
Replacement for the Text Area widget, to allow users to format there text.
Create free form documents, with images and tables.
Provide a nice front end for your products, with click-able links to forms with detailed information.

## Features and limitations
- Free formed, rich text
- Insert links that triggers microflows
- Insert images from your domain model.
- Insert links to or images from remote locations.
- Create and manipulate tables
- Provide styles based on a predefined CSS stylesheet.
- Choose from four predefined functionality sets.
..and many more: undo, redo, cut, copy, paste, paste from Word, search and replace, optimize HTML, full screen mode, CSS based styles, HTML tag based styles, fonts, colors, text decorations, numbering, alignment, special characters, edit styles directly, edit HTML directly
- Optional Ice Change Tracker

Ice properties cannot be configured manually
-name defaults to the current Username
-id is unused and defaults to 1
Ice doesn't run on jQuery 1.9

## Configuration
Both the Rich Text Viewer and Editor should be used in a dataview, and use a single attribute of the context object to show or edit.
Microflows invoked by the Viewer receive the domain object object as argument.

The configuration of the stylesheet properties in the viewer and editor should match.
The configuration of the Microflow link properties in the viewer and editor should match.


## Properties


### Rich Text Viewer
Attribute

The attribute to display. Should be of type String.

Height

Viewer height in pixels. Use '0' for 'auto'.

Max length

Maximum number of characters that will be shown. The text will be truncated after this amount of characters. In the case of rich text (that is, the No rich text property is set to false), this is an estimation.

Microflow links

Microflows which can be invoked from the Rich Text can be defined here. The names should match the ones defined for the corresponding editor. Should not be used in combination with the Onclick event. If the rich text is not generated using a rich text editor, but somewhere in your model, you can use the following url in the source of the rich text to invoke one of the microflows from the mapping:



<a href="javascript:${MyMicroflowName}">Click me!</a>

Microflow links > Link Name

The descriptive name of the microflow link. This attribute should match the corresponding Rich Text Editor configuration.

Microflow links > Microflow

The microflow that will be invoked when the link is clicked.

Plain Text (previously: No rich text)

Set this property if you use the viewer to display a property which does not contain rich text. This causes the viewer to avoid interpreting the contents as HTML and makes line breaks for non-html fields work. Use this property when you want to display text that was not entered using the Rich Text Editor.

Onclick

The microflow that will be invoked when the user clicks anywhere on the viewer. Should not be used in combination with Microflow links.

Stylesheet

Stylesheet (CSS) file containing the styles used by the HTML. Should be provided by- or be based on your theming. It should be the same stylesheet as used in the corresponding editor.

Width

Viewer width in pixels. Use '0' for 100% of the available space.



###  Simple Rich Text Editor
Attribute

The attribute to manipulate

Button set [Simple, Stylist, Advanced, All]

Simple: Only the most trivial buttons. The styles the user can choose from depend on the stylesheet.
Stylist: All options to manipulate text are turned on, however tables, attributes etc are disabled.
Advanced: The most powerful features of the rich text editor can be used.
All: All features, including the less common, are enabled.



See the screenshots for the differences.

Height

Maximum height of the editor in pixels. Use zero for 'auto'

Image Entity

This domain entity will be browsable and insertable as image. Should inherit from System.Image

Image Upload Microflow

This microflow should open a form to allow users to upload a new image.

Microflow links

Microflows which can be linked to in the text.

Microflow links > Link Name

Descriptive name of a microflow, which can be inserted as link in the document. The mapping of the name to a real microflow is the responsibility of the Rich Text Viewer.

Stylesheet

Stylesheet (CSS) file containing the by default available styles. If provided, the Styles dropdown will appear, containing a list of all available classes in the stylesheet. Furthermore the stylesheet might influence the built in styles. The same stylesheet value should be used for the corresponding Rich Text Viewer.

XPath Constraint

This constraint might be used to filter the set of browsable images.

Appearance

Language of the rich text editor (popups, tooltips etc.). More languages can be requested at support.mendix.com. Note that some dialogs might not be translated. This property only influences the language of the widget, the language of the spellchecker, if applicable, is controled by the browser.



WARNING: All rich text editors need to use the same language, otherwise the translation fails



Enable spellchecking

If true, the built-in spell checker of the browser (if available) will be enabled on this text editor.

Onchange Microflow

Microflow to trigger on change.



Be aware that when you refresh the current object; it might replace the current contents of the editor! Especially when there is some latency involved.



Onleave Microflow

Microflow to trigger when the widget looses focus.



Be aware that when you refresh the current object; it might replace the current contents of the editor! Especially when there is some latency involved.





Use Ice Change Tracker

Whether or not to enable the Ice change tracker in this field



Known issues


Not compatible with PhoneGap projects, please use 'CKEditor for Mendix' instead.
Empty pop-ups when server XFRAME option headers are set to DENY.
A form opened by the Image Upload Microflow might appear behind the Select Image form.
The rich text editor breaks/ dissappears in a popup form with autoclose, if there are data validations when closing. This is due to a bug in the client. A work around is to use a custom save button with a 'change and commit with events' activity and a 'close form' activity.
