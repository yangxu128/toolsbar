export interface ParsedXml {
  headers: string[]
  data: Record<string, string>[]
}

export function parseXmlFile(text: string): ParsedXml {
  const trimmed = text.trim()
  if (trimmed.startsWith('dn|') || trimmed.includes('\n') && trimmed.split('\n')[0].includes('|')) {
    return parseCsvPipe(trimmed)
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'text/xml')

  const parseError = doc.querySelector('parsererror')
  if (parseError) throw new Error(`XML解析错误: ${parseError.textContent}`)

  const root = doc.documentElement

  const type1 = tryType1(root)
  if (type1) return type1

  const type2 = tryType2(root)
  if (type2) return type2

  return tryType3(root)
}

function parseCsvPipe(text: string): ParsedXml {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length < 2) throw new Error('CSV文件没有足够的数据行')

  const headers = lines[0].split('|')
  const data: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('|')
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = values[idx] || '' })
    data.push(row)
  }

  return { headers, data }
}

function tryType1(root: Element): ParsedXml | null {
  const fieldNames = root.querySelectorAll('FieldName > N')
  const fieldValues = root.querySelectorAll('FieldValue > Object')

  if (!fieldNames.length || !fieldValues.length) return null

  const headersMap = new Map<number, string>()
  fieldNames.forEach((elem) => {
    const i = parseInt(elem.getAttribute('i') || '0')
    headersMap.set(i, (elem.textContent || '').trim())
  })

  const headers = Array.from(headersMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, v]) => v)

  const data: Record<string, string>[] = []

  fieldValues.forEach((obj) => {
    const row: Record<string, string> = {}
    const dn = obj.getAttribute('Dn')
    if (dn) row['Dn'] = dn

    const vDict = new Map<number, string>()
    obj.querySelectorAll(':scope > V').forEach((vElem) => {
      const i = parseInt(vElem.getAttribute('i') || '0')
      vDict.set(i, (vElem.textContent || '').trim())
    })

    headers.forEach((h, idx) => {
      row[h] = vDict.get(idx + 1) || ''
    })

    data.push(row)
  })

  return { headers, data }
}

function tryType2(root: Element): ParsedXml | null {
  const smrElements = root.querySelectorAll('smr')
  const objectElements = root.querySelectorAll('object')

  if (!smrElements.length || !objectElements.length) return null

  const smrHeaders = (smrElements[0].textContent || '').trim().split(/\s+/)

  const objAttrNames: string[] = []
  if (objectElements[0]) {
    for (const attr of Array.from(objectElements[0].attributes)) {
      if (attr.name && !objAttrNames.includes(attr.name)) {
        objAttrNames.push(attr.name)
      }
    }
  }

  const headers = [...objAttrNames, ...smrHeaders]
  const data: Record<string, string>[] = []

  objectElements.forEach((obj) => {
    const baseRow: Record<string, string> = {}
    objAttrNames.forEach(attr => { baseRow[attr] = obj.getAttribute(attr) || '' })

    obj.querySelectorAll(':scope > v').forEach((vElem) => {
      const values = (vElem.textContent || '').trim().split(/\s+/)
      const row: Record<string, string> = { ...baseRow }
      smrHeaders.forEach((h, i) => { row[h] = values[i] || '' })
      data.push(row)
    })
  })

  return { headers, data }
}

function tryType3(root: Element): ParsedXml {
  const children = Array.from(root.children).filter(c => c.tagName.toLowerCase() !== 'fileheader')
  if (!children.length) throw new Error('XML文件没有有效的子元素')

  const allTags = new Set<string>()
  children.forEach(child => {
    child.querySelectorAll('*').forEach(el => allTags.add(el.tagName))
  })
  const headers = Array.from(allTags)

  const data: Record<string, string>[] = []
  children.forEach(child => {
    const row: Record<string, string> = {}
    headers.forEach(tag => {
      const el = child.querySelector(tag)
      row[tag] = el ? (el.textContent || '').trim() : ''
    })
    data.push(row)
  })

  return { headers, data }
}
