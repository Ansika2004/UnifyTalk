import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PictogramBoard } from './PictogramBoard'

describe('PictogramBoard', () => {
  it('renders empty composition area with placeholder text', () => {
    render(<PictogramBoard onSend={vi.fn()} />)
    expect(screen.getByText('Tap symbols below to compose a message')).toBeInTheDocument()
  })

  it('adds a symbol to composition when clicked', () => {
    render(<PictogramBoard onSend={vi.fn()} />)
    // Default category is 'needs'; click the Water symbol (role=gridcell)
    fireEvent.click(screen.getByRole('gridcell', { name: 'Add Water' }))
    // Placeholder should be gone and the symbol should appear in composition
    expect(screen.queryByText('Tap symbols below to compose a message')).not.toBeInTheDocument()
    // The remove button for the added symbol should now exist
    expect(screen.getByRole('button', { name: 'Remove Water' })).toBeInTheDocument()
  })

  it('removes a symbol from composition', () => {
    render(<PictogramBoard onSend={vi.fn()} />)
    fireEvent.click(screen.getByRole('gridcell', { name: 'Add Water' }))
    expect(screen.getByRole('button', { name: 'Remove Water' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remove Water' }))
    expect(screen.queryByRole('button', { name: 'Remove Water' })).not.toBeInTheDocument()
    expect(screen.getByText('Tap symbols below to compose a message')).toBeInTheDocument()
  })

  it('send button is disabled when composition is empty', () => {
    render(<PictogramBoard onSend={vi.fn()} />)
    const sendBtn = screen.getByRole('button', { name: 'Send composed message' })
    expect(sendBtn).toBeDisabled()
  })

  it('send button calls onSend with composed symbols and clears composition', () => {
    const onSend = vi.fn()
    render(<PictogramBoard onSend={onSend} />)

    fireEvent.click(screen.getByRole('gridcell', { name: 'Add Water' }))
    fireEvent.click(screen.getByRole('gridcell', { name: 'Add Food' }))

    const sendBtn = screen.getByRole('button', { name: 'Send composed message' })
    expect(sendBtn).not.toBeDisabled()
    fireEvent.click(sendBtn)

    expect(onSend).toHaveBeenCalledTimes(1)
    const calledWith = onSend.mock.calls[0][0]
    expect(calledWith).toHaveLength(2)
    expect(calledWith[0].id).toBe('needs-water')
    expect(calledWith[1].id).toBe('needs-food')

    // Composition should be cleared after send
    expect(screen.getByText('Tap symbols below to compose a message')).toBeInTheDocument()
  })

  it('keyword search filters symbols', () => {
    render(<PictogramBoard onSend={vi.fn()} />)
    const searchInput = screen.getByRole('searchbox', { name: 'Search pictograms' })
    fireEvent.change(searchInput, { target: { value: 'water' } })

    // Both 'needs-water' and 'food-water' match the keyword 'water' — expect 2 results
    expect(screen.getAllByRole('gridcell', { name: 'Add Water' })).toHaveLength(2)
    // A symbol that doesn't match 'water' should not be visible
    expect(screen.queryByRole('gridcell', { name: 'Add Food' })).not.toBeInTheDocument()
  })

  it('empty search shows no symbols found message', () => {
    render(<PictogramBoard onSend={vi.fn()} />)
    const searchInput = screen.getByRole('searchbox', { name: 'Search pictograms' })
    fireEvent.change(searchInput, { target: { value: 'xyzabc123' } })

    expect(screen.getByText('No symbols found')).toBeInTheDocument()
  })

  it('category tabs filter symbols', () => {
    render(<PictogramBoard onSend={vi.fn()} />)
    // Click the Pain tab
    fireEvent.click(screen.getByRole('tab', { name: 'Pain' }))

    // A pain symbol should be visible (role=gridcell)
    expect(screen.getByRole('gridcell', { name: 'Add Sharp Pain' })).toBeInTheDocument()
    // A needs symbol should not be visible
    expect(screen.queryByRole('gridcell', { name: 'Add Water' })).not.toBeInTheDocument()
  })
})
