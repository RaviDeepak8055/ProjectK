import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import './CustomSelect.css';

const CustomSelect = ({ options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const handleSelect = (option) => {
    onChange({ target: { name: 'organizationType', value: option.value } });
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="login__input custom-select" ref={dropdownRef} onClick={() => setIsOpen(!isOpen)}>
      <span className={!value ? 'placeholder' : ''}>
        {value ? options.find(opt => opt.value === value)?.label : placeholder}
      </span>
      <FaChevronDown 
        className={`custom-select-toggle ${isOpen ? 'open' : ''}`} 
        size={16}
      />
      
      {isOpen && (
        <div className="select-dropdown">
          <ul>
            {options.map((option) => (
              <li
                key={option.value}
                onClick={() => handleSelect(option)}
                className={value === option.value ? 'selected' : ''}
              >
                {option.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
