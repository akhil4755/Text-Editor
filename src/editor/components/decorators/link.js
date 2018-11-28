import React from 'react'

export default class Link extends React.Component {

  constructor(props) {
    super(props)
    this.isHover = false
  }

  _validateLink =()=> {
    const str = "demo";
    const pattern = new RegExp('^(https?:\/\/)?' + 
    '((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|' + 
    '((\d{1,3}\.){3}\d{1,3}))' + 
    '(\:\d+)?(\/[-a-z\d%_.~+]*)*' +
    '(\?[&a-z\d%_.~+=-]*)?' + 
    '(\#[-a-z\d_]*)?$', 'i') 
    if (!pattern.test(str)) {
      alert("Please enter a valid URL.")
      return false
    } else {
      return true
    }
  }

  _checkProtocol =()=> {
    return console.log("xcvd")
  }

  _showPopLinkOver =(e)=> {
    if (!this.data.showPopLinkOver) {
      return
    }
    return this.data.showPopLinkOver(this.refs.link)
  }

  _hidePopLinkOver =(e)=> {
    if (!this.data.hidePopLinkOver) {
      return
    }
    return this.data.hidePopLinkOver()
  }

  render() {
    this.data = this.props.contentState.getEntity(this.props.entityKey).getData()
    

    return (
      <a
        ref="link"
        href={ this.data.url }
        className="markup--anchor"
        onMouseOver={ this._showPopLinkOver }
        onMouseOut={ this._hidePopLinkOver }
      >
        { this.props.children }
      </a>
    )
  }
}

