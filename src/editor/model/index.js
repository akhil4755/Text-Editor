import { Map } from 'immutable';



import { EditorState, ContentBlock, genKey } from 'draft-js';


export const getDefaultBlockData = (blockType, initialData = {}) => {
  switch (blockType) {
    default: return initialData;
  }
};

export const getNode = (root=window) => {
  let t = null
  if (root.getSelection){
    t = root.getSelection()
  } else if (root.document.getSelection){
    t = root.document.getSelection()
  } else if (root.document.selection){
    t = root.document.selection.createRange().text
  }
  return t
}


export const getCurrentBlock = (editorState) => {
  const selectionState = editorState.getSelection();
  const contentState = editorState.getCurrentContent();
  const block = contentState.getBlockForKey(selectionState.getStartKey());
  return block;
};


export const addNewBlock = (editorState, newType = "unstyled", initialData = {}) => {
  const selectionState = editorState.getSelection();
  if (!selectionState.isCollapsed()) {
    return editorState;
  }
  const contentState = editorState.getCurrentContent();
  const key = selectionState.getStartKey();
  const blockMap = contentState.getBlockMap();
  const currentBlock = getCurrentBlock(editorState);
  if (!currentBlock) {
    return editorState;
  }
  if (currentBlock.getLength() === 0) {
    if (currentBlock.getType() === newType) {
      return editorState;
    }
    const newBlock = currentBlock.merge({
      type: newType,
      data: getDefaultBlockData(newType, initialData),
    });
    const newContentState = contentState.merge({
      blockMap: blockMap.set(key, newBlock),
      selectionAfter: selectionState,
    });
    return EditorState.push(editorState, newContentState, 'change-block-type');
  }
  return editorState;
};


export const resetBlockWithType = (editorState, newType = "unstyled", data={}) => {
  const contentState = editorState.getCurrentContent();
  const selectionState = editorState.getSelection();
  const key = selectionState.getStartKey();
  const blockMap = contentState.getBlockMap();
  const block = blockMap.get(key);

  const text = block.getText();

  const newBlock = block.merge({
    text: text,
    type: newType,
    data: getDefaultBlockData(newType, data),
  });
  const newContentState = contentState.merge({
    blockMap: blockMap.set(key, newBlock),
    selectionAfter: selectionState.merge({
      anchorOffset: 0,
      focusOffset: 0,
    }),
  });
  return EditorState.push(editorState, newContentState, 'change-block-type');
};


export const updateDataOfBlock = (editorState, block, newData) => {
  const contentState = editorState.getCurrentContent();
  const newBlock = block.merge({
    data: newData,
  });
  const newContentState = contentState.merge({
    blockMap: contentState.getBlockMap().set(block.getKey(), newBlock),
  });
  return EditorState.push(editorState, newContentState, 'change-block-type');
};

export const updateTextOfBlock = (editorState, block, text) => {
  const contentState = editorState.getCurrentContent();
  const newBlock = block.merge({
    text: text,
  });
  const newContentState = contentState.merge({
    blockMap: contentState.getBlockMap().set(block.getKey(), newBlock),
  });

  return EditorState.push(editorState, newContentState, 'replace-text');
};

export const updateCharacterListOfBlock = (editorState, block, text, charList) => {
  const contentState = editorState.getCurrentContent()
  
  const newBlock = block.merge({
    text: text,
    characterList: charList
  });
  
  const newContentState = contentState.merge({
    blockMap: contentState.getBlockMap().set(block.getKey(), newBlock),
  });

  return EditorState.push(editorState, newContentState, 'replace-text');
};


export const addNewBlockAt = (
    editorState,
    pivotBlockKey,
    newBlockType = "unstyled",
    initialData = {}
  ) => {
  const content = editorState.getCurrentContent();
  const blockMap = content.getBlockMap();
  const block = blockMap.get(pivotBlockKey);
  const blocksBefore = blockMap.toSeq().takeUntil((v) => (v === block));
  const blocksAfter = blockMap.toSeq().skipUntil((v) => (v === block)).rest();
  const newBlockKey = genKey();

  const newBlock = new ContentBlock({
    key: newBlockKey,
    type: newBlockType,
    text: '',
    characterList: block.getCharacterList().slice(0, 0),
    depth: 0,
    data: Map(getDefaultBlockData(newBlockType, initialData)),
  });

  const newBlockMap = blocksBefore.concat(
    [[pivotBlockKey, block], [newBlockKey, newBlock]],
    blocksAfter
  ).toOrderedMap();

  const selection = editorState.getSelection();

  const newContent = content.merge({
    blockMap: newBlockMap,
    selectionBefore: selection,
    selectionAfter: selection.merge({
      anchorKey: newBlockKey,
      anchorOffset: 0,
      focusKey: newBlockKey,
      focusOffset: 0,
      isBackward: false,
    }),
  });
  return EditorState.push(editorState, newContent, 'split-block');
};
