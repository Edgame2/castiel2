/**
 * Templates Gallery Component
 * Browse, filter, and use project templates with preview and setup wizard
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Star, Download, Eye, ExternalLink } from 'lucide-react';
import { getAuthTokenForRequest } from '@/lib/auth-utils';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  author: string;
  rating: number;
  downloads: number;
  thumbnail: string;
  setupGuide?: string;
  checklist?: Array<{
    id: string;
    title: string;
    description: string;
  }>;
}

interface TemplatesGalleryProps {
  onTemplateSelected?: (template: Template) => void;
}

export const TemplatesGallery: React.FC<TemplatesGalleryProps> = ({ onTemplateSelected }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'downloads' | 'recent'>('rating');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const categories = [
    'all',
    'business',
    'startup',
    'nonprofit',
    'education',
    'healthcare',
    'technology',
    'marketing',
    'finance',
  ];

  useEffect(() => {
    loadTemplates();
  }, [selectedCategory, searchQuery, sortBy]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const token = await getAuthTokenForRequest();
      const response = await axios.get('/api/v1/templates/gallery', {
        params: {
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          search: searchQuery || undefined,
          sortBy,
          limit: 50,
        },
        headers: { Authorization: `Bearer ${token || ''}` },
        withCredentials: true,
      });
      setTemplates(response.data.templates);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to load templates', 3, {
        errorMessage: errorObj.message,
        category: selectedCategory,
        searchQuery,
        sortBy,
      })
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async (template: Template) => {
    if (onTemplateSelected) {
      onTemplateSelected(template);
    } else {
      // Navigate to create project with template
      window.location.href = `/projects/new?templateId=${template.id}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Templates Gallery</h1>
        <p className="text-slate-600">Choose from professionally designed templates to jumpstart your project</p>
      </div>

      {/* Search & Filters */}
      <div className="mb-8 space-y-4">
        <input
          type="text"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-6 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex gap-4">
          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 font-medium"
          >
            <option value="rating">Top Rated</option>
            <option value="downloads">Most Popular</option>
            <option value="recent">Recently Added</option>
          </select>
        </div>
      </div>

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-8 w-full max-w-2xl my-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">{selectedTemplate.name}</h2>
                <p className="text-slate-600 mt-2">by {selectedTemplate.author}</p>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Preview */}
            {selectedTemplate.thumbnail && (
              <img
                src={selectedTemplate.thumbnail}
                alt={selectedTemplate.name}
                className="w-full h-64 object-cover rounded-lg mb-6"
              />
            )}

            {/* Description */}
            <p className="text-slate-700 mb-6">{selectedTemplate.description}</p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm text-slate-600">Rating</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-lg font-bold text-slate-900">{selectedTemplate.rating}</span>
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        fill={i < Math.floor(selectedTemplate.rating) ? 'currentColor' : 'none'}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-600">Downloads</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{selectedTemplate.downloads.toLocaleString()}</p>
              </div>
            </div>

            {/* Checklist */}
            {selectedTemplate.checklist && selectedTemplate.checklist.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 mb-3">Setup Checklist</h3>
                <ul className="space-y-2">
                  {selectedTemplate.checklist.map((item) => (
                    <li key={item.id} className="flex items-start gap-3">
                      <input type="checkbox" className="mt-1" />
                      <div>
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <p className="text-sm text-slate-600">{item.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="flex-1 px-6 py-3 bg-slate-200 text-slate-900 rounded-lg font-medium hover:bg-slate-300 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleUseTemplate(selectedTemplate);
                  setSelectedTemplate(null);
                }}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Use Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center h-64">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <p className="text-slate-600 text-lg">No templates found</p>
            <p className="text-slate-500 mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow overflow-hidden cursor-pointer group"
            >
              {/* Image */}
              <div className="relative h-40 bg-slate-100 overflow-hidden">
                {template.thumbnail ? (
                  <img
                    src={template.thumbnail}
                    alt={template.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <Eye size={40} />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-slate-900 text-lg">{template.name}</h3>
                <p className="text-slate-600 text-sm mt-1 line-clamp-2">{template.description}</p>

                {/* Category */}
                <div className="mt-3 flex gap-2">
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                    {template.category}
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                    {template.subcategory}
                  </span>
                </div>

                {/* Stats */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Star size={16} className="text-yellow-400" fill="currentColor" />
                    <span className="text-sm font-semibold text-slate-900">{template.rating}</span>
                    <span className="text-xs text-slate-500">({template.downloads} downloads)</span>
                  </div>
                </div>

                {/* Action */}
                <button
                  onClick={() => setSelectedTemplate(template)}
                  className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  View & Use
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TemplatesGallery;
