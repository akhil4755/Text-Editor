import React from 'react'
import { SketchPicker } from 'react-color';

import {fontColor} from "../icons.js"

export default class DanteTooltipColor extends React.Component {

  constructor(...args) {
    super(...args)
    this.state = {
      open: false,
      value: this.props.value
    }
  }

  componentWillReceiveProps(nextProps) {
    if(nextProps.show === false){
      this.setState({open: false})
    }
  }

  toggle =(ev)=> {
    ev.preventDefault()
    this.setState({open: true })
  }

  handleClick =(e, item)=>{
    e.preventDefault()
    this.setState({value: item},
      ()=>{
        let o = { [this.props.style_type]: this.state.value }
        this.props.handleClick(e, o)
      }
    )
  }

  currentValue =()=>{
    let selection = this.props.editorState.getSelection()
    if (!selection.isCollapsed()) {
      return this.props.styles[this.props.style_type].current(this.props.editorState)
    } else {
      return
    }

  }

  renderColor =()=>{
    const v = this.currentValue() || this.props.value

    if(this.state.open){
      return (
        <div style={{position: 'absolute'}}>
          <SketchPicker
            color={ v }
            presetColors={[]}
            onChangeComplete={(color, e)=>{
              this.handleClick(e,  color.hex )}
            }
          />
        </div>
      )
    }
  }

  render() {
    return (
      <li className="dante-menu-button"
        onMouseDown={ this.toggle }>
        <span className={ 'dante-icon'}>
          {fontColor()}
        </span>

        { this.renderColor()}
      </li>
    )
  }
}