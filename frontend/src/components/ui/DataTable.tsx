import type { ReactNode } from 'react'
import { EmptyState } from './States'

export interface Column<T> {
  key: string
  title: ReactNode
  align?: 'left' | 'right'
  width?: string
  render: (row: T) => ReactNode
}

export function DataTable<T>({
  columns,
  rows,
  onRowClick,
  emptyTitle = 'No records found',
  emptySub,
  emptyIcon,
  rowKey,
}: {
  columns: Column<T>[]
  rows: T[]
  onRowClick?: (row: T) => void
  emptyTitle?: string
  emptySub?: string
  emptyIcon?: ReactNode
  rowKey: (row: T) => React.Key
}) {
  if (rows.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} sub={emptySub} />
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={col.align === 'right' ? 'num' : ''}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={onRowClick ? 'clickable' : ''}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} className={col.align === 'right' ? 'num' : ''}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}