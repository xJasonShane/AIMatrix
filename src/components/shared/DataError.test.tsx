import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DataError } from './DataError'

it('renders an alert with the validation message and the fix hint', () => {
  render(<DataError message="categories[0].links[0].url 缺失或不是非空字符串" />)
  expect(screen.getByRole('alert')).toBeTruthy()
  expect(screen.getByText('navigation.json 数据无效')).toBeTruthy()
  expect(screen.getByText('categories[0].links[0].url 缺失或不是非空字符串')).toBeTruthy()
  expect(screen.getByText(/请修复/)).toBeTruthy()
})
