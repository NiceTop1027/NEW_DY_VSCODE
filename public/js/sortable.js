// public/js/sortable.js
// Drag and drop with SortableJS

import Sortable from 'sortablejs';

class SortableManager {
  constructor() {
    this.instances = new Map();
  }

  // Make element sortable
  makeSortable(element, options = {}) {
    const defaultOptions = {
      animation: 150,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      handle: options.handle || null,
      filter: options.filter || null,
      onEnd: (evt) => {
        console.log(`Moved from ${evt.oldIndex} to ${evt.newIndex}`);
        if (options.onEnd) options.onEnd(evt);
      }
    };

    const sortable = Sortable.create(element, {
      ...defaultOptions,
      ...options
    });

    this.instances.set(element, sortable);
    return sortable;
  }

  // Make tabs sortable
  makeTabsSortable(tabsContainer, onReorder) {
    return this.makeSortable(tabsContainer, {
      animation: 150,
      handle: '.tab',
      filter: '.tab-close',
      onEnd: (evt) => {
        if (onReorder) {
          const tabs = Array.from(tabsContainer.children);
          const tabPaths = tabs.map(tab => tab.dataset.filePath);
          onReorder(tabPaths);
        }
      }
    });
  }

  // Make file tree sortable
  makeFileTreeSortable(treeContainer, onReorder) {
    return this.makeSortable(treeContainer, {
      animation: 150,
      handle: '.tree-item',
      group: 'file-tree',
      onEnd: (evt) => {
        if (onReorder) {
          onReorder(evt);
        }
      }
    });
  }

  // Make list sortable
  makeListSortable(listElement, onReorder) {
    return this.makeSortable(listElement, {
      animation: 150,
      onEnd: (evt) => {
        if (onReorder) {
          const items = Array.from(listElement.children);
          onReorder(items, evt);
        }
      }
    });
  }

  // Destroy sortable
  destroy(element) {
    const sortable = this.instances.get(element);
    if (sortable) {
      sortable.destroy();
      this.instances.delete(element);
    }
  }

  // Destroy all
  destroyAll() {
    this.instances.forEach(sortable => sortable.destroy());
    this.instances.clear();
  }

  // Get sortable instance
  getInstance(element) {
    return this.instances.get(element);
  }
}

export const sortable = new SortableManager();
export default sortable;
