
import React from 'react'

export default class DanteTooltipList extends React.Component {

  logChange =(val)=> {
  }

  promptForLink =(ev)=> {
    let selection = this.props.editorState.getSelection()
    if (!selection.isCollapsed()) {
  
    }
  }

  currentValue =()=>{
    if(this.props.style_type  === "block"){
      return  
    }
     
    let selection = this.props.editorState.getSelection()
    if (!selection.isCollapsed()) {
      return this.props.styles[this.props.style_type].current(this.props.editorState)
    } else {
      return
    }
    
  }

  render() {
    const v = this.currentValue() || this.props.value

    return (
      <li className="dante-menu-button visible-overflow" 
        onMouseDown={ this.promptForLink }>
        <DropDown 
          items={this.props.items}
          value={v}
          style_type={this.props.style_type}
          handleClick={this.props.handleClick}
        />
      </li>
    )
  }
}


class DropDown extends React.Component {

  constructor(...args) {
    super(...args);
    this.state = {
      open: false,
      value: this.props.value
    }
  }

  toggle=(e)=>{
    e.preventDefault()
    this.setState({open: !this.state.open})
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

  render(){
    return (
      <div className={`dropdown ${this.state.open ? 'open' : ''}`} >
        <button className="btn btn-default dropdown-toggle" 
                type="button" id="dropdownMenu1" 
                data-toggle="dropdown" 
                aria-haspopup="true" 
                aria-expanded="true">
          {this.props.value}
          <span className="caret"></span>
        </button>
        <ul className="dropdown-menu" aria-labelledby="dropdownMenu1">
          {
            this.props.items.map( (o)=>{
              return (<DropDownItem 
                            item={o} 
                            handleClick={ this.handleClick }/> )
            })
          }
        </ul>
      </div>
    )
  }
}

class DropDownItem extends React.Component {
  render(){
    return (
      <li>
        <button 
          onClick={(e)=> e.preventDefault()}
          onMouseDown={(e)=>this.props.handleClick(e, this.props.item)}>
          {this.props.item}
        </button>
      </li>
    )
  }
}
