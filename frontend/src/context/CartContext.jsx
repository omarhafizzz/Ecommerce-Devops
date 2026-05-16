import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { cartAPI } from '../utils/api'
import { useAuth } from './AuthContext'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { user } = useAuth()
  const [cart, setCart] = useState({ items: [], subtotal: 0 })
  const [loading, setLoading] = useState(false)

  const fetchCart = useCallback(async () => {
    if (!user) { setCart({ items: [], subtotal: 0 }); return }
    try {
      setLoading(true)
      const res = await cartAPI.get()
      setCart(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchCart() }, [fetchCart])

  const addToCart = async (product_id, quantity = 1) => {
    const res = await cartAPI.add({ product_id, quantity })
    setCart(res.data)
  }

  const updateItem = async (id, quantity) => {
    const res = await cartAPI.update(id, quantity)
    setCart(res.data)
  }

  const removeItem = async (id) => {
    const res = await cartAPI.remove(id)
    setCart(res.data)
  }

  const clearCart = async () => {
    const res = await cartAPI.clear()
    setCart(res.data)
  }

  const itemCount = cart.items.reduce((s, i) => s + i.quantity, 0)

  return (
    <CartContext.Provider value={{ cart, loading, addToCart, updateItem, removeItem, clearCart, itemCount, fetchCart }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
