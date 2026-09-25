/**
 * Split text into semantic chunks with sliding overlap
 * 
 * @param {string} text - The raw text extracted from PDF or Excel
 * @param {object} options - Chunking configuration options
 * @param {number} options.chunkSize - Target maximum characters per chunk (default: 800)
 * @param {number} options.chunkOverlap - Overlapping characters between consecutive chunks (default: 150)
 * @returns {Array<{ chunkIndex: number, text: string, charCount: number, tokenEstimate: number }>}
 */
export const splitIntoChunks = (
  text,
  { chunkSize = 800, chunkOverlap = 150 } = {}
) => {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return [];
  }

  const cleanedText = text.trim();

  // If text is already smaller than or equal to chunkSize, return single chunk
  if (cleanedText.length <= chunkSize) {
    return [
      {
        chunkIndex: 0,
        text: cleanedText,
        charCount: cleanedText.length,
        tokenEstimate: Math.ceil(cleanedText.length / 4)
      }
    ];
  }

  const chunks = [];
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < cleanedText.length) {
    let endIndex = startIndex + chunkSize;

    if (endIndex < cleanedText.length) {
      // Natural boundary preservation: Search for nearest paragraph, sentence, or word before endIndex
      const boundaryWindow = cleanedText.slice(
        Math.max(startIndex, endIndex - 120),
        Math.min(cleanedText.length, endIndex + 20)
      );

      // Priority boundaries: \n\n (paragraph) -> \n (line/row) -> . / ? / ! (sentence) -> ' ' (word)
      const paragraphBreak = boundaryWindow.lastIndexOf('\n\n');
      const lineBreak = boundaryWindow.lastIndexOf('\n');
      const sentenceBreak = Math.max(
        boundaryWindow.lastIndexOf('. '),
        boundaryWindow.lastIndexOf('? '),
        boundaryWindow.lastIndexOf('! ')
      );
      const spaceBreak = boundaryWindow.lastIndexOf(' ');

      let bestCut = -1;
      if (paragraphBreak !== -1) {
        bestCut = paragraphBreak + 2;
      } else if (lineBreak !== -1) {
        bestCut = lineBreak + 1;
      } else if (sentenceBreak !== -1) {
        bestCut = sentenceBreak + 2;
      } else if (spaceBreak !== -1) {
        bestCut = spaceBreak + 1;
      }

      if (bestCut !== -1) {
        const relativeOffset = Math.max(startIndex, endIndex - 120);
        endIndex = relativeOffset + bestCut;
      }
    } else {
      endIndex = cleanedText.length;
    }

    const chunkText = cleanedText.slice(startIndex, endIndex).trim();

    if (chunkText.length > 0) {
      chunks.push({
        chunkIndex,
        text: chunkText,
        charCount: chunkText.length,
        tokenEstimate: Math.ceil(chunkText.length / 4)
      });
      chunkIndex++;
    }

    // Stop if we have reached the end of the text
    if (endIndex >= cleanedText.length) {
      break;
    }

    // Advance start index ensuring we move forward with overlap
    const nextStart = endIndex - chunkOverlap;
    startIndex = nextStart > startIndex ? nextStart : endIndex;
  }

  return chunks;
};
