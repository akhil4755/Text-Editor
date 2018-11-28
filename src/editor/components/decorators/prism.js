

import Prism from 'prismjs';
import React from 'react'
import PrismDecorator from 'draft-js-prism'

const defaultFilter =(block)=> {
  return block.getType() === 'code-block';
}

const defaultGetSyntax = (block)=> {
  if (block.getData) {
      return block.getData().get('syntax');
  }

  return null; 
}

const defaultRender =(props)=> {
  return React.createElement(
    "span",
    { className: 'prism-token token ' + props.type },
    props.children
  );
}

const PrismOptions = {
  defaultSyntax:      null,
  filter:             defaultFilter,
  getSyntax:          defaultGetSyntax,
  render:             defaultRender,
  prism:              Prism
}

export const PrismDraftDecorator = ()=> ( new PrismDecorator( PrismOptions ) )




