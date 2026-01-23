/**
 * DataTable Export Utilities
 * 
 * Provides CSV and Excel export functionality for DataTable
 */

interface ExportColumn<TData> {
  id: string
  header: string
  accessor: (row: TData) => unknown
}

/**
 * Convert data to CSV format and trigger download
 */
export function exportToCSV<TData>(
  data: TData[],
  columns: ExportColumn<TData>[],
  filename: string
): void {
  // Generate CSV content
  const headers = columns.map(col => escapeCSVValue(col.header)).join(',')
  const rows = data.map(row => 
    columns.map(col => {
      const value = col.accessor(row)
      return escapeCSVValue(formatValue(value))
    }).join(',')
  )
  
  const csv = [headers, ...rows].join('\n')
  
  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${filename}.csv`)
}

/**
 * Convert data to Excel format (XLSX) and trigger download
 * Uses a simple XML-based approach that Excel can read
 */
export function exportToExcel<TData>(
  data: TData[],
  columns: ExportColumn<TData>[],
  filename: string
): void {
  // Generate Excel XML (SpreadsheetML format)
  const worksheetName = 'Sheet1'
  
  // Build rows
  const headerRow = columns.map(col => 
    `<Cell><Data ss:Type="String">${escapeXML(col.header)}</Data></Cell>`
  ).join('')
  
  const dataRows = data.map(row => {
    const cells = columns.map(col => {
      const value = col.accessor(row)
      const { type, formattedValue } = getExcelType(value)
      return `<Cell><Data ss:Type="${type}">${escapeXML(formattedValue)}</Data></Cell>`
    }).join('')
    return `<Row>${cells}</Row>`
  }).join('')
  
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#E0E0E0" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="${escapeXML(worksheetName)}">
    <Table>
      <Row ss:StyleID="Header">${headerRow}</Row>
      ${dataRows}
    </Table>
  </Worksheet>
</Workbook>`

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' })
  downloadBlob(blob, `${filename}.xls`)
}

/**
 * Convert data to JSON format and trigger download
 */
export function exportToJSON<TData>(
  data: TData[],
  filename: string
): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  downloadBlob(blob, `${filename}.json`)
}

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Escape CSV special characters
 */
function escapeCSVValue(value: string): string {
  // If value contains comma, newline, or quote, wrap in quotes and escape inner quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Escape XML special characters
 */
function escapeXML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Format value for export
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  
  if (value instanceof Date) {
    return value.toISOString()
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  
  return String(value)
}

/**
 * Get Excel data type for a value
 */
function getExcelType(value: unknown): { type: string; formattedValue: string } {
  if (value === null || value === undefined) {
    return { type: 'String', formattedValue: '' }
  }
  
  if (typeof value === 'number') {
    return { type: 'Number', formattedValue: String(value) }
  }
  
  if (typeof value === 'boolean') {
    return { type: 'Boolean', formattedValue: value ? '1' : '0' }
  }
  
  if (value instanceof Date) {
    return { type: 'DateTime', formattedValue: value.toISOString() }
  }
  
  return { type: 'String', formattedValue: formatValue(value) }
}

/**
 * Trigger browser download for a blob
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a' as any)
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}











