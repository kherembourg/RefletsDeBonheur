import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminSection, AdminDivider, AdminEmptyState } from './AdminSection';
import { Settings, Plus } from 'lucide-react';

describe('AdminSection', () => {
  describe('rendering', () => {
    it('should render with title', () => {
      render(
        <AdminSection title="Settings">
          <p>Content</p>
        </AdminSection>
      );
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render children content', () => {
      render(
        <AdminSection title="Section">
          <p>Child content</p>
        </AdminSection>
      );
      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('should render with description', () => {
      render(
        <AdminSection title="Profile" description="Manage your profile settings">
          <div>Content</div>
        </AdminSection>
      );
      expect(screen.getByText('Manage your profile settings')).toBeInTheDocument();
    });

    it('should render without description', () => {
      render(
        <AdminSection title="Simple Section">
          <div>Content</div>
        </AdminSection>
      );
      expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
    });
  });

  describe('icon display', () => {
    it('should render with icon', () => {
      render(
        <AdminSection title="Settings" icon={Settings}>
          <div>Content</div>
        </AdminSection>
      );
      
      // Check for icon container
      const container = screen.getByText('Settings').closest('div')?.parentElement;
      expect(container?.querySelector('.text-burgundy-old')).toBeInTheDocument();
    });

    it('should render without icon', () => {
      render(
        <AdminSection title="No Icon Section">
          <div>Content</div>
        </AdminSection>
      );
      
      const iconContainer = document.querySelector('.w-10.h-10.rounded-lg');
      expect(iconContainer).not.toBeInTheDocument();
    });
  });

  describe('action element', () => {
    it('should render action element', () => {
      render(
        <AdminSection 
          title="Users" 
          action={<button>Add User</button>}
        >
          <div>List</div>
        </AdminSection>
      );
      expect(screen.getByText('Add User')).toBeInTheDocument();
    });

    it('should position action element correctly', () => {
      render(
        <AdminSection 
          title="Users" 
          action={<button>Action</button>}
        >
          <div>List</div>
        </AdminSection>
      );
      
      const actionButton = screen.getByText('Action');
      expect(actionButton.closest('.shrink-0')).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <AdminSection title="Custom" className="custom-class">
          <div>Content</div>
        </AdminSection>
      );
      
      const section = container.querySelector('section');
      expect(section?.className).toContain('custom-class');
    });
  });

  describe('semantic HTML', () => {
    it('should render as section element', () => {
      const { container } = render(
        <AdminSection title="Test">
          <div>Content</div>
        </AdminSection>
      );
      
      expect(container.querySelector('section')).toBeInTheDocument();
    });

    it('should use h2 for title', () => {
      render(
        <AdminSection title="Main Title">
          <div>Content</div>
        </AdminSection>
      );
      
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Main Title');
    });
  });
});

describe('AdminDivider', () => {
  describe('rendering', () => {
    it('should render divider with default symbol', () => {
      render(<AdminDivider />);
      expect(screen.getByText('❧')).toBeInTheDocument();
    });

    it('should render divider with custom symbol', () => {
      render(<AdminDivider symbol="•" />);
      expect(screen.getByText('•')).toBeInTheDocument();
    });

    it('should have gradient lines', () => {
      const { container } = render(<AdminDivider />);
      const gradients = container.querySelectorAll('.bg-gradient-to-r');
      expect(gradients.length).toBe(2); // Left and right gradients
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(<AdminDivider className="custom-divider" />);
      expect(container.firstChild).toHaveClass('custom-divider');
    });
  });
});

describe('AdminEmptyState', () => {
  describe('rendering', () => {
    it('should render with title', () => {
      render(<AdminEmptyState title="No items found" />);
      expect(screen.getByText('No items found')).toBeInTheDocument();
    });

    it('should render with description', () => {
      render(
        <AdminEmptyState 
          title="Empty" 
          description="Add your first item to get started"
        />
      );
      expect(screen.getByText('Add your first item to get started')).toBeInTheDocument();
    });

    it('should render without description', () => {
      render(<AdminEmptyState title="Empty State" />);
      // Should not throw, description is optional
      expect(screen.getByText('Empty State')).toBeInTheDocument();
    });
  });

  describe('icon display', () => {
    it('should render with icon', () => {
      render(
        <AdminEmptyState title="No Data" icon={Plus} />
      );
      
      const iconContainer = document.querySelector('.w-16.h-16');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should render without icon', () => {
      render(<AdminEmptyState title="No Icon" />);
      
      const iconContainer = document.querySelector('.w-16.h-16');
      expect(iconContainer).not.toBeInTheDocument();
    });
  });

  describe('action element', () => {
    it('should render action element', () => {
      render(
        <AdminEmptyState 
          title="Empty" 
          action={<button>Create New</button>}
        />
      );
      expect(screen.getByText('Create New')).toBeInTheDocument();
    });

    it('should render without action', () => {
      render(<AdminEmptyState title="Empty" />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <AdminEmptyState title="Custom" className="custom-empty" />
      );
      expect(container.firstChild).toHaveClass('custom-empty');
    });
  });

  describe('layout', () => {
    it('should center content', () => {
      const { container } = render(
        <AdminEmptyState title="Centered" />
      );
      expect(container.firstChild).toHaveClass('text-center');
    });

    it('should have proper spacing', () => {
      const { container } = render(
        <AdminEmptyState title="Spacing" />
      );
      expect(container.firstChild).toHaveClass('py-12');
    });
  });
});
