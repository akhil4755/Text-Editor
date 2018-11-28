import { ContentState, convertFromHTML, getSafeBodyFromHTML } from 'draft-js'





let compose = function() {
  let args = arguments
  let start = args.length - 1
  return function() {
    let i = start
    let result = args[start].apply(this, arguments)
    while (i--) {
      result = args[i].call(this, result)
    }
    return result
  }
}




let getBlockSpecForElement = imgElement=> {
  return {
    contentType: 'image',
    imgSrc: imgElement.getAttribute('src')
  }
}


let wrapBlockSpec = blockSpec=> {
  if (blockSpec === null) {
    return null
  }

  let tempEl = document.createElement('blockquote')

  tempEl.innerText = JSON.stringify(blockSpec)
  return tempEl
}


let replaceElement = (oldEl, newEl)=> {
  if (!(newEl instanceof HTMLElement)) {
    return
  }

  let upEl = getUpEl(oldEl)

  return upEl.parentNode.insertBefore(newEl, upEl)
}

var getUpEl = el=> {
  while (el.parentNode) {
    if (el.parentNode.tagName !== 'BODY') {
      el = el.parentNode
    }
    if (el.parentNode.tagName === 'BODY') { return el }
  }
}

let elementToBlockSpecElement = compose(wrapBlockSpec, getBlockSpecForElement)

let imgReplacer = imgElement=> {
  return replaceElement(imgElement, elementToBlockSpecElement(imgElement))
}



let customHTML2Content = function(HTML, blockRn){
  let tempDoc = new DOMParser().parseFromString(HTML, 'text/html')

  
  tempDoc.querySelectorAll('img').forEach( item=> imgReplacer(item))

 
  let content = convertFromHTML(tempDoc.body.innerHTML,
        getSafeBodyFromHTML,
        blockRn
  )

  let contentBlocks = content.contentBlocks

 
  contentBlocks = contentBlocks.map(function(block){
    console.log("CHECK BLOCK", block.getType())
    if (block.getType() !== 'blockquote') {
      return block
    }

    let json = ""
    try {
      json = JSON.parse(block.getText())
    } catch (error) {
      return block
    }
    

    return block.merge({
      type: "image",
      text: "",
      data: {
        url: json.imgSrc,
        forceUpload: true
      }
    })
  })

  tempDoc = null
  return ContentState.createFromBlockArray(contentBlocks)
}


export default customHTML2Content