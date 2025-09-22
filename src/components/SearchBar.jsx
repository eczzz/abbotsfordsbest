import React, { useState } from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({ placeholder = "Search categories...", onSelect }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  // Sample categories for autocomplete
  const categories = [
    'Auto Glass Repair',
    'Restaurants & Cafes',
    'Home Services', 
    'Professional Services',
    'Shopping & Retail',
    'Health & Wellness',
    'Auto Repair',
    'Real Estate',
    'Contractors',
    'Beauty & Spa'
  ];

  const filteredCategories = categories.filter(category =>
    category.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setIsOpen(e.target.value.length > 0);
  };

  const handleCategorySelect = (category) => {
    setQuery(category);
    setIsOpen(false);
    if (onSelect) {
      const slug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      onSelect(slug);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (filteredCategories.length > 0) {
      handleCategorySelect(filteredCategories[0]);
    }
  };

  return (
    <div className="relative max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(query.length > 0)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            placeholder={placeholder}
            className="w-full px-6 py-4 text-lg border-2 border-white/20 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white pr-16 placeholder-gray-600"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary-700 text-white p-3 rounded-xl hover:bg-primary-800 transition-colors duration-200 shadow-lg"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>
      </form>

      {/* Autocomplete dropdown */}
      {isOpen && filteredCategories.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg">
          {filteredCategories.map((category, index) => (
            <button
              key={category}
              onMouseDown={() => handleCategorySelect(category)}
              className={`w-full text-left px-6 py-3 hover:bg-gray-50 transition-colors duration-150 ${
                index === 0 ? 'rounded-t-2xl' : ''
              } ${index === filteredCategories.length - 1 ? 'rounded-b-2xl' : ''}`}
            >
              <div className="flex items-center">
                <Search className="h-4 w-4 text-gray-400 mr-3" />
                <span className="text-gray-900">{category}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;