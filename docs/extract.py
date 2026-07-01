import zipfile
import xml.etree.ElementTree as ET
import sys

def extract_docx_text(path):
    ns = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
    p_tag = ns + 'p'
    t_tag = ns + 't'
    tr_tag = ns + 'tr'
    tc_tag = ns + 'tc'
    tbl_tag = ns + 'tbl'
    
    with zipfile.ZipFile(path) as docx:
        tree = ET.parse(docx.open('word/document.xml'))
        root = tree.getroot()
        
        out = []
        body = root.find(ns + 'body')
        if body is not None:
            for child in body:
                if child.tag == tbl_tag:
                    for row in child.iter(tr_tag):
                        row_texts = []
                        for cell in row.iter(tc_tag):
                            cell_texts = []
                            for p in cell.iter(p_tag):
                                cell_p_texts = [t.text for t in p.iter(t_tag) if t.text]
                                if cell_p_texts:
                                    cell_texts.append(''.join(cell_p_texts))
                            row_texts.append(' '.join(cell_texts))
                        out.append(' | '.join(row_texts))
                elif child.tag == p_tag:
                    texts = [t.text for t in child.iter(t_tag) if t.text]
                    if texts:
                        out.append(''.join(texts))
        return '\n'.join(out)

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python extract.py <input.docx> <output.txt>")
        sys.exit(1)
    text = extract_docx_text(sys.argv[1])
    with open(sys.argv[2], 'w', encoding='utf-8') as f:
        f.write(text)
    print("Done")
