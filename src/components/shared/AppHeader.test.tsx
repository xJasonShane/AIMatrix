import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AppHeader } from './AppHeader'

describe('AppHeader', () => {
  it('navigates to /matrix when the switch button is clicked', () => {
    render(
      <MemoryRouter initialEntries={['/nav']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/nav" element={<AppHeader view="nav" />} />
          <Route path="/matrix" element={<div>matrix page</div>} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('link', { name: /矩阵/i }))
    expect(screen.getByText('matrix page')).toBeInTheDocument()
  })
})
