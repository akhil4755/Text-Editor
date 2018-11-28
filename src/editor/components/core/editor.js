
import React from 'react'
import { Map } from 'immutable'
import {isEmpty} from "lodash"
import { convertToRaw, convertFromRaw, getDefaultKeyBinding, Editor, EditorState, Entity, RichUtils, DefaultDraftBlockRenderMap, SelectionState, Modifier} from 'draft-js'
import { convertToHTML,} from 'draft-convert'
import { addNewBlock, resetBlockWithType, updateDataOfBlock, getCurrentBlock, addNewBlockAt } from '../../model/index.js'

import Debug from './debug'
import SaveBehavior from '../../utils/save_content'
import customHTML2Content from '../../utils/html2content'
import createStyles from 'draft-js-custom-styles'

export default class DanteEditor extends React.Component {
  constructor(props) {
    super(props)
    this.render = this.render.bind(this)

    this.decorator = this.props.decorators(this)

    this.blockRenderMap = Map({
     
      'unstyled': {
        wrapper: null,
        element: 'div'
      },
      'paragraph': {
        wrapper: null,
        element: 'div'
      },
      'placeholder': {
        wrapper: null,
        element: 'div'
      }

    })

    this.extendedBlockRenderMap = DefaultDraftBlockRenderMap.merge(this.blockRenderMap)

    this.state = {
      editorState: EditorState.createEmpty(),
      blockRenderMap: this.extendedBlockRenderMap,
      locks: 0,
    }
    this.block_types = this.props.block_types

    const { styles, customStyleFn, exporter } = createStyles(['font-size', 'color', 'font-family']);
    this.styles = styles
    this.customStyleFn = customStyleFn
    this.styleExporter = exporter
    this.save = new SaveBehavior({
      getLocks: this.getLocks,
      config: {
        xhr: this.props.xhr,
        data_storage: this.props.data_storage
      },
      editor: this,
      editorState: this.getEditorState,
      editorContent: this.emitSerializedOutput()
    })
  }

  componentDidMount(){
    this.initializeState()
    window.addEventListener('resize', ()=> {
      if(this.relocateTooltips)
        setTimeout(() => {
          return this.relocateTooltips()
        })
    })
  }

  initializeState = ()=> {
    let newEditorState = EditorState.createEmpty(this.decorator)
    if (this.props.content) {
      newEditorState = EditorState.set(this.decodeEditorContent(this.props.content), {decorator: this.decorator});
    }
    this.onChange(newEditorState)      
  }

  decodeEditorContent =(raw_as_json)=> {
    const new_content = convertFromRaw(raw_as_json)
    return EditorState.createWithContent(new_content, this.decorator)
  }

  refreshSelection =(newEditorState)=> {
    const { editorState } = this.state
    const s = editorState.getSelection()
    const focusOffset = s.getFocusOffset()
    const anchorKey = s.getAnchorKey()

    let selectionState = SelectionState.createEmpty(s.getAnchorKey())

    selectionState = selectionState.merge({
      anchorOffset: focusOffset,
      focusKey: anchorKey,
      focusOffset
    })

    let newState = EditorState.forceSelection(newEditorState, selectionState)

    return this.onChange(newState)
  }

  forceRender =(editorState)=> {
    const content = editorState.getCurrentContent()
    const newEditorState = EditorState.createWithContent(content, this.decorator)
    return this.refreshSelection(newEditorState)
  }

  onChange =(editorState)=> {
    
    this.setPreContent()
    this.setState({ editorState } , ()=>{


      if (!editorState.getSelection().isCollapsed()) {
        const currentBlock = getCurrentBlock(this.state.editorState)
        const blockType = currentBlock.getType()
        const tooltip = this.tooltipsWithProp('displayOnSelection')[0]
        if(!tooltip) return 
        if (!this.tooltipHasSelectionElement(tooltip, blockType)) {
          return
        }
        this.handleTooltipDisplayOn('displayOnSelection')
      } else {
        this.handleTooltipDisplayOn('displayOnSelection', false)
      }

      setTimeout(() => {
        return this.relocateTooltips()
      })

      return this.dispatchChangesToSave()

    })
  }

  handleUndeletables =(editorState)=>{
  
    const undeletable_types = this.props.widgets.filter(
      function(o){ return o.undeletable })
    .map(function(o){ return o.type })
    
    const blockMap = editorState.getCurrentContent().get("blockMap")

    const undeletablesMap = blockMap
    .filter(function(o){ 
      return undeletable_types.indexOf(o.get("type")) > 0 
    })

    if (undeletable_types.length > 0 && undeletablesMap.size === 0) {

      const contentState = editorState.getCurrentContent();
      const newContentState = contentState.merge({
        blockMap: this.state.editorState.getCurrentContent().blockMap,
        selectionBefore: contentState.getSelectionAfter()
      });

      return editorState = EditorState.push(editorState, newContentState, 'change-block')
    }

    return editorState
  }

  dispatchChangesToSave = ()=> {
    clearTimeout(this.saveTimeout)
    return this.saveTimeout = setTimeout(() => {
      return this.save.store(this.emitSerializedOutput())
    }, 100)
  }

  setPreContent = ()=> {
    const content = this.emitSerializedOutput()
    return this.save.editorContent = content
  }

  focus = ()=> {

  }


  getEditorState = ()=> {
    return this.state.editorState
  }

  emitSerializedOutput = ()=> {
    const raw = convertToRaw(this.state.editorState.getCurrentContent())
    return raw
  }


  getTextFromEditor = ()=> {
    const c = this.state.editorState.getCurrentContent()
    const out = c.getBlocksAsArray().map(o => {
      return o.getText()
    }).join("\n")

    return out
  }

  emitHTML2 = ()=> {
    return convertToHTML({
      entityToHTML: (entity, originalText) => {
        if (entity.type === 'LINK') {
          return `<a href="${ entity.data.url }">${ originalText }</a>`
        } else {
          return originalText
        }
      }

    })(this.state.editorState.getCurrentContent())
  }

  getLocks = ()=> {
    return this.state.locks
  }

  addLock = ()=> {
    let locks = this.state.locks
    return this.setState({
      locks: locks += 1 })
  }

  removeLock = ()=> {
    let locks = this.state.locks
    return this.setState({
      locks: locks -= 1 })
  }

  renderableBlocks = ()=> {
    return this.props.widgets.filter(o => o.renderable).map(o => o.type)
  }

  defaultWrappers =(blockType)=> {
    return this.props.default_wrappers.filter(o => {
      return o.block === blockType
    }).map(o => o.className)
  }

  blockRenderer =(block)=> {


    if (this.renderableBlocks().includes(block.getType())) {
      return this.handleBlockRenderer(block)
    }

    return null
  }

  handleBlockRenderer =(block)=> {
    const dataBlock = this.getDataBlock(block)
    if (!dataBlock) {
      return null
    }

    const read_only = this.props.read_only ? false : null
    const editable = read_only !== null ? read_only : dataBlock.editable
    
    return {
      component: dataBlock.block,
      editable,
      props: {
        data: block.getData(),
        getEditorState: this.getEditorState,
        setEditorState: this.onChange,
        addLock: this.addLock,
        toggleEditable: this.toggleEditable,
        disableEditable: this.disableEditable,
        enableEditable: this.enableEditable,
        removeLock: this.removeLock,
        getLocks: this.getLocks,
        getEditor: ()=>{ return this },
        config: dataBlock.options
      }
    }
  }

  blockStyleFn =(block)=> {
    const currentBlock = getCurrentBlock(this.state.editorState)
    if(!currentBlock) return
    const is_selected = currentBlock.getKey() === block.getKey() ? "is-selected" : ""

    if (this.renderableBlocks().includes(block.getType())) {
      return this.styleForBlock(block, currentBlock, is_selected)
    }

    const defaultBlockClass = this.defaultWrappers(block.getType())
    if (defaultBlockClass.length > 0) {
      return `graf ${ defaultBlockClass[0] } ${ is_selected }`
    } else {
      return `graf ${ is_selected }`
    }
  }

  getDataBlock =(block)=> {
    return this.props.widgets.find(o => {
      return o.type === block.getType()
    })
  }

  styleForBlock =(block, currentBlock, is_selected)=> {
    const dataBlock = this.getDataBlock(block)

    if (!dataBlock) {
      return null
    }

    const selectedFn = dataBlock.selectedFn ? dataBlock.selectedFn(block) : ''
    const selected_class = (dataBlock.selected_class ? dataBlock.selected_class : '' )
    const selected_class_out = is_selected ? selected_class : ''

    return `${ dataBlock.wrapper_class } ${ selected_class_out } ${ selectedFn }`
  }

  handleTooltipDisplayOn =(prop, display)=> {

    if(this.props.read_only){
      return  
    }

    if (display == null) {
      display = true
    }
    
    return setTimeout(() => {
      const items = this.tooltipsWithProp(prop)
      return items.map(o => {
        if(!this || !this.refs || !this.refs[o.ref]) return
        this.refs[o.ref].display(display)
        return this.refs[o.ref].relocate()
      })
    }, 20)
  }

  handlePasteText =(text, html)=> {

    if (!html) {
      return this.handleTXTPaste(text, html)
    }
    if (html) {
      return this.handleHTMLPaste(text, html)
    }
  }

  handleTXTPaste =(text, html)=> {
    const currentBlock = getCurrentBlock(this.state.editorState)

    let { editorState } = this.state

    switch (currentBlock.getType()) {
      case "placeholder":
        const newContent = Modifier.replaceText(editorState.getCurrentContent(), new SelectionState({
          anchorKey: currentBlock.getKey(),
          anchorOffset: 0,
          focusKey: currentBlock.getKey(),
          focusOffset: 2
        }), text)

        editorState = EditorState.push(editorState, newContent, 'replace-text')

        this.onChange(editorState)

        return true
      default:
        return false
    }
  }

  handleHTMLPaste =(text, html)=> {

    const currentBlock = getCurrentBlock(this.state.editorState)

    switch (currentBlock.getType()) {
      case "placeholder":
        return this.handleTXTPaste(text, html)
    }

    const newContentState = customHTML2Content(html, this.extendedBlockRenderMap)

    const selection = this.state.editorState.getSelection()
    const endKey = selection.getEndKey()

    const content = this.state.editorState.getCurrentContent()
    const blocksBefore = content.blockMap.toSeq().takeUntil(v => v.key === endKey)
    const blocksAfter = content.blockMap.toSeq().skipUntil(v => v.key === endKey).rest()

    const newBlockKey = newContentState.blockMap.first().getKey()

    const newBlockMap = blocksBefore.concat(newContentState.blockMap, blocksAfter).toOrderedMap()

    const newContent = content.merge({
      blockMap: newBlockMap,
      selectionBefore: selection,
      selectionAfter: selection.merge({
        anchorKey: newBlockKey,
        anchorOffset: 0,
        focusKey: newBlockKey,
        focusOffset: 0,
        isBackward: false
      })
    })

    const pushedContentState = EditorState.push(this.state.editorState, newContent, 'insert-fragment')

    this.onChange(pushedContentState)

    return true
  }

  handleUpArrow =(e)=> {
    return setTimeout(() => {
      return this.forceRender(this.state.editorState)
    }, 10)
  }

  handleDownArrow =(e)=> {
    return setTimeout(() => {
      return this.forceRender(this.state.editorState)
    }, 10)
  }

  handleReturn =(e)=> {
    if (this.props.handleReturn) {
      if (this.props.handleReturn()) {
        return true
      }
    }

    let { editorState } = this.state

    if (e.shiftKey) {
      this.setState({ editorState: RichUtils.insertSoftNewline(editorState) });
      return true;
    }


    if (!e.altKey && !e.metaKey && !e.ctrlKey) {
      const currentBlock = getCurrentBlock(editorState)
      const blockType = currentBlock.getType()
      const selection = editorState.getSelection()

      const config_block = this.getDataBlock(currentBlock)

      if (currentBlock.getText().length === 0) {

        if (config_block && config_block.handleEnterWithoutText) {
          config_block.handleEnterWithoutText(this, currentBlock)
          this.closePopOvers()
          return true
        }

        switch (blockType) {
          case "header-one":
            this.onChange(resetBlockWithType(editorState, "unstyled"))
            return true
            break
          default:
            return false
        }
      }

      if (currentBlock.getText().length > 0) {

        if (config_block && config_block.handleEnterWithText) {
          config_block.handleEnterWithText(this, currentBlock)
          this.closePopOvers()
          return true
        }

        if (currentBlock.getLength() === selection.getStartOffset()) {
          if (this.props.continuousBlocks.indexOf(blockType) < 0) {
            this.onChange(addNewBlockAt(editorState, currentBlock.getKey()))
            return true
          }
        }

        return false
      }

 
      if (currentBlock.getLength() === selection.getStartOffset()) {

        if (this.props.continuousBlocks.indexOf(blockType) < 0) {
          this.onChange(addNewBlockAt(editorState, currentBlock.getKey()))
          return true
        }
        return false
      }

      return false
    }
  }

  handleBeforeInput =(chars)=> {
    const currentBlock = getCurrentBlock(this.state.editorState)

    if(!currentBlock) return

    const blockType = currentBlock.getType()
    const selection = this.state.editorState.getSelection()

    let { editorState } = this.state


    if (currentBlock.getText().length !== 0) {

      this.closePopOvers()
    }


    const endOffset = selection.getEndOffset()
    const endKey = currentBlock.getEntityAt(endOffset - 1)
    const endEntityType = endKey && Entity.get(endKey).getType()
    const afterEndKey = currentBlock.getEntityAt(endOffset)
    const afterEndEntityType = afterEndKey && Entity.get(afterEndKey).getType()

    if (chars === ' ' && endEntityType === 'LINK' && afterEndEntityType !== 'LINK') {
      const newContentState = Modifier.insertText(editorState.getCurrentContent(), selection, ' ')
      const newEditorState = EditorState.push(editorState, newContentState, 'insert-characters')
      this.onChange(newEditorState)
      return true
    }

    if (blockType.indexOf('atomic') === 0) {
      return false
    }

    const blockLength = currentBlock.getLength()
    if (selection.getAnchorOffset() > 1 || blockLength > 1) {
      return false
    }

    const blockTo = this.props.character_convert_mapping[currentBlock.getText() + chars]

    if (!blockTo) {
      return false
    }

    console.log(`BLOCK TO SHOW: ${ blockTo }`)

    this.onChange(resetBlockWithType(editorState, blockTo))

    return true
  }

  handleKeyCommand =(command)=> {
    const { editorState } = this.state
    let newBlockType

    if (this.props.handleKeyCommand && this.props.handleKeyCommand(command)) {
      return true
    }

    if (command === 'add-new-block') {
      this.onChange(addNewBlock(editorState, 'blockquote'))
      return true
    }

    if (command.indexOf('toggle_inline:') === 0) {
      newBlockType = command.split(':')[1]
      this.onChange(RichUtils.toggleInlineStyle(editorState, newBlockType))
      return true
    }

    if (command.indexOf('toggle_block:') === 0) {
      newBlockType = command.split(':')[1]
      this.onChange(RichUtils.toggleBlockType(editorState, newBlockType))
      return true
    }

    const newState = RichUtils.handleKeyCommand(this.state.editorState, command)
    if (newState) {
      this.onChange(newState)
      return true
    }

    return false
  }

  findCommandKey =(opt, command)=> {
    return this.props.key_commands[opt].find(o => o.key === command)
  }

  KeyBindingFn =(e)=> {

       let cmd
    if (e.altKey) {
      if (e.shiftKey) {
        cmd = this.findCommandKey("alt-shift", e.which)
        if (cmd) {
          return cmd.cmd
        }

        return getDefaultKeyBinding(e)
      }

      if (e.ctrlKey || e.metaKey) {
        cmd = this.findCommandKey("alt-cmd", e.which)
        if (cmd) {
          return cmd.cmd
        }
        return getDefaultKeyBinding(e)
      }
    } else if (e.ctrlKey || e.metaKey) {
      cmd = this.findCommandKey("cmd", e.which)
      if (cmd) {
        return cmd.cmd
      }
      return getDefaultKeyBinding(e)

    } 

    return getDefaultKeyBinding(e)
  }


  updateBlockData =(block, options)=> {
    const data = block.getData()
    const newData = data.merge(options)
    const newState = updateDataOfBlock(this.state.editorState, block, newData)

    return this.forceRender(newState)
  }

  setDirection =(direction_type)=> {
    const contentState = this.state.editorState.getCurrentContent()
    const selectionState = this.state.editorState.getSelection()
    const block = contentState.getBlockForKey(selectionState.anchorKey)

    return this.updateBlockData(block, { direction: direction_type })
  }

  
  toggleEditable = ()=> {
    this.closePopOvers()
    return this.props.toggleEditable(()=> this.testEmitAndDecode ) 
  }

  disableEditable = ()=> {
    console.log("in !!")
    this.closePopOvers()
    return this.setState({ read_only: true }, this.testEmitAndDecode)
  }

  enableEditable = ()=> {
    this.closePopOvers()
    console.log("out !!")
    return this.setState({ read_only: false }, this.testEmitAndDecode)
  }

  closePopOvers = ()=> {
    return this.props.tooltips.map(o => {
      return this.refs[o.ref].hide()
    })
  }

  relocateTooltips = ()=> {
    if (this.props.read_only)
      return 

    if (isEmpty(this.refs))
      return

    if (!getCurrentBlock(this.state.editorState)) return

    return this.props.tooltips.map(o => {
      return this.refs[o.ref].relocate()
    })
  }

  tooltipsWithProp =(prop)=> {
    return this.props.tooltips.filter(o => {
      return o[prop]
    })
  }

  tooltipHasSelectionElement =(tooltip, element)=> {
    return tooltip.selectionElements.includes(element)
  }

  handleShowPopLinkOver =(e)=> {
    return this.showPopLinkOver()
  }

  handleHidePopLinkOver =(e)=> {
    return this.hidePopLinkOver()
  }

  showPopLinkOver =(el)=> {
    if(!this.refs.anchor_popover)
      return

    let coords
    this.refs.anchor_popover.setState({ url: el ? el.href : this.refs.anchor_popover.state.url })

    if (el) {
      coords = this.refs.anchor_popover.relocate(el)
    }

    if (coords) {
      this.refs.anchor_popover.setPosition(coords)
    }

    this.refs.anchor_popover.setState({ show: true })

    this.isHover = true
    return this.cancelHide()
  }

  hidePopLinkOver = ()=> {
    if(!this.refs.anchor_popover)
      return
    
    return this.hideTimeout = setTimeout(() => {
      return this.refs.anchor_popover.hide()
    }, 300)
  }

  cancelHide = ()=> {
    return clearTimeout(this.hideTimeout)
  }

  render() {
    return (
      <div suppressContentEditableWarning={ true }>
        
          <div className="postContent">
            <div className="section-inner layoutSingleColumn"
                 onClick={ this.focus }>
              <Editor
                blockRendererFn={ this.blockRenderer }
                editorState={ this.state.editorState }
                onChange={ this.onChange }
                handleDrop={this.handleDrop}
                onUpArrow={ this.handleUpArrow }
                onDownArrow={ this.handleDownArrow }
                handleReturn={ this.handleReturn }
                blockRenderMap={ this.state.blockRenderMap }
                blockStyleFn={ this.blockStyleFn }
                customStyleFn={this.customStyleFn }
                handlePastedText={ this.handlePasteText }
                handlePastedFiles={ this.handlePasteImage }
                handleDroppedFiles={ this.handleDroppedFiles }
                handleKeyCommand={ this.handleKeyCommand }
                keyBindingFn={ this.KeyBindingFn }
                handleBeforeInput={ this.handleBeforeInput }
                readOnly={ this.props.read_only }
                placeholder={ this.props.body_placeholder }
                ref="editor"
              />
            </div>
          </div>
       
        { 

          this.props.tooltips.map( (o, i) => {
            return (
              <o.component
                ref={ o.ref }
                key={ i }
                editor={ this }
                editorState={ this.state.editorState }
                onChange={ this.onChange }
                styles={this.styles}
                configTooltip={ o }
                widget_options={ o.widget_options }
                showPopLinkOver={ this.showPopLinkOver }
                hidePopLinkOver={ this.hidePopLinkOver }
                handleOnMouseOver={ this.handleShowPopLinkOver }
                handleOnMouseOut={ this.handleHidePopLinkOver }
              />
            )
          })
          
        }
        {
          this.props.debug
          ? <Debug locks={ this.state.locks } editor={ this } />
          : undefined
        }

      </div>

    )
  }
}