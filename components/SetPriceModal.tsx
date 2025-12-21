import React, { useState } from 'react'
import styles from './SetPriceModal.module.css'
import Modal from './Modal'

// Removed type definition as it's now part of the component's props

export default function SetValueModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  currentValue = '0', 
  type = 'price',
  title,
  description,
  prefix = '',
  placeholder = '0',
  maxValue = 999999.99
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: (value: string) => void
  currentValue?: string
  type?: 'price' | 'stock'
  title?: string
  description?: string
  prefix?: string
  placeholder?: string
  maxValue?: number
}) {
  const [value, setValue] = useState(currentValue)
  const [error, setError] = useState('')

  const handleConfirm = () => {
    // Remove any non-numeric characters except decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '')
    const valueNum = parseFloat(cleanValue)

    if (isNaN(valueNum) || valueNum < 0) {
      setError(`Por favor ingrese un ${type === 'price' ? 'precio' : 'stock'} válido`)
      return
    }

    if (valueNum > maxValue) {
      setError(`El ${type === 'price' ? 'precio' : 'stock'} no puede exceder ${maxValue}`)
      return
    }

    onConfirm(type === 'price' ? valueNum.toFixed(2) : Math.round(valueNum).toString())
    onClose()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    setValue(inputValue)
    setError('')
  }

  // Dynamically set title and description if not provided
  const modalTitle = title || (type === 'price' 
    ? 'Establecer precio para todas las variantes' 
    : 'Establecer stock para todas las variantes')
  
  const modalDescription = description || (type === 'price'
    ? 'Ingrese el precio que se aplicará a todas las variantes del producto.'
    : 'Ingrese el stock que se aplicará a todas las variantes del producto.')

  const confirmButtonText = type === 'price' ? 'Aplicar precio' : 'Aplicar stock'

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title={modalTitle}
      size="small"
    >
      <div className={styles.priceModalContent}>
        <p className={styles.priceModalDescription}>
          {modalDescription}
        </p>
        
        <div className={styles.priceInputContainer}>
          {prefix && <span className={styles.currencyPrefix}>{prefix}</span>}
          <input 
            type="text" 
            value={value}
            onChange={handleInputChange}
            placeholder={placeholder}
            className={`${styles.priceInput} ${error ? styles.inputError : ''}`}
            autoFocus
          />
        </div>
        
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        <div className={styles.modalActions}>
          <button 
            className={styles.cancelButton} 
            onClick={onClose}
          >
            Cancelar
          </button>
          <button 
            className={styles.confirmButton} 
            onClick={handleConfirm}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </Modal>
  )
}