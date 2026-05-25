export interface ParsedXml {
  headers: string[]
  data: Record<string, string>[]
}

export function parseXmlFile(text: string): ParsedXml {
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

  const headers = (smrElements[0].textContent || '').trim().split(/\s+/)
  const data: Record<string, string>[] = []

  objectElements.forEach((obj) => {
    obj.querySelectorAll(':scope > v').forEach((vElem) => {
      const values = (vElem.textContent || '').trim().split(/\s+/)
      if (values.length !== headers.length) return
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = values[i] || '' })
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
