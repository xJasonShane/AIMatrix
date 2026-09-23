import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NavProvider } from '../store/useNavStore'
import { NavPage } from './NavPage'
import raw from '../data/navigation.json'

const count = (raw as { categories: { links: unknown[] }[] }).categories
  .reduce((n, c) => n + c.links.length, 0)

it('renders one card per link', () => {
  render(
    <MemoryRouter><NavProvider><NavPage /></NavProvider></MemoryRouter>,
  )
  expect(document.querySelectorAll('.link-card').length).toBe(count)
})

it('opens links in a new tab', () => {
  render(
    <MemoryRouter><NavProvider><NavPage /></NavProvider></MemoryRouter>,
  )
  const chatgpt = screen.getByRole('link', { name: /ChatGPT/ })
  expect(chatgpt).toHaveAttribute('target', '_blank')
  expect(chatgpt).toHaveAttribute('rel', 'noreferrer')
})
