import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  AdminCard, 
  AdminCardHeader, 
  AdminCardTitle, 
  AdminCardBody, 
  AdminCardFooter 
} from './AdminCard';

describe('AdminCard', () => {
  describe('rendering', () => {
    it('should render children content', () => {
      render(
        <AdminCard>
          <p>Card content</p>
        </AdminCard>
      );
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should render as div by default', () => {
      const { container } = render(<AdminCard>Content</AdminCard>);
      const div = container.querySelector('div');
      expect(div).toBeInTheDocument();
    });

    it('should render as button when onClick provided', () => {
      render(<AdminCard onClick={vi.fn()}>Clickable</AdminCard>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('padding variants', () => {
    it('should apply medium padding by default', () => {
      const { container } = render(<AdminCard>Default</AdminCard>);
      const card = container.firstChild;
      expect(card).toHaveClass('p-6');
    });

    it('should apply no padding', () => {
      const { container } = render(<AdminCard padding="none">No padding</AdminCard>);
      const card = container.firstChild;
      expect(card?.className).not.toContain('p-');
    });

    it('should apply small padding', () => {
      const { container } = render(<AdminCard padding="sm">Small</AdminCard>);
      const card = container.firstChild;
      expect(card).toHaveClass('p-4');
    });

    it('should apply large padding', () => {
      const { container } = render(<AdminCard padding="lg">Large</AdminCard>);
      const card = container.firstChild;
      expect(card).toHaveClass('p-8');
    });
  });

  describe('hover effect', () => {
    it('should not have hover effect by default', () => {
      const { container } = render(<AdminCard>No hover</AdminCard>);
      const card = container.firstChild;
      expect(card?.className).not.toContain('hover:shadow-md');
    });

    it('should apply hover effect when hover is true', () => {
      const { container } = render(<AdminCard hover>Hoverable</AdminCard>);
      const card = container.firstChild;
      expect(card).toHaveClass('hover:shadow-md');
      expect(card).toHaveClass('cursor-pointer');
    });
  });

  describe('click handler', () => {
    it('should call onClick when clicked', async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      
      render(<AdminCard onClick={onClick}>Click me</AdminCard>);
      
      await user.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when not provided', async () => {
      const user = userEvent.setup();
      
      render(<AdminCard>No click</AdminCard>);
      
      // Should not throw
      const card = screen.getByText('No click');
      await user.click(card);
    });

    it('should apply full width when clickable', () => {
      render(<AdminCard onClick={vi.fn()}>Clickable</AdminCard>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full');
      expect(button).toHaveClass('text-left');
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <AdminCard className="custom-card">Custom</AdminCard>
      );
      const card = container.firstChild;
      expect(card).toHaveClass('custom-card');
    });

    it('should merge custom className with defaults', () => {
      const { container } = render(
        <AdminCard className="extra">Merged</AdminCard>
      );
      const card = container.firstChild;
      expect(card).toHaveClass('extra');
      expect(card).toHaveClass('bg-white');
      expect(card).toHaveClass('rounded-lg');
    });
  });

  describe('default styling', () => {
    it('should have white background', () => {
      const { container } = render(<AdminCard>Test</AdminCard>);
      const card = container.firstChild;
      expect(card).toHaveClass('bg-white');
    });

    it('should have rounded corners', () => {
      const { container } = render(<AdminCard>Test</AdminCard>);
      const card = container.firstChild;
      expect(card).toHaveClass('rounded-lg');
    });

    it('should have border and shadow', () => {
      const { container } = render(<AdminCard>Test</AdminCard>);
      const card = container.firstChild;
      expect(card).toHaveClass('border');
      expect(card).toHaveClass('shadow-xs');
    });
  });
});

describe('AdminCardHeader', () => {
  describe('rendering', () => {
    it('should render children', () => {
      render(
        <AdminCardHeader>
          <h2>Header Title</h2>
        </AdminCardHeader>
      );
      expect(screen.getByText('Header Title')).toBeInTheDocument();
    });

    it('should render action element', () => {
      render(
        <AdminCardHeader action={<button>Edit</button>}>
          <h2>Title</h2>
        </AdminCardHeader>
      );
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('should render without action', () => {
      render(
        <AdminCardHeader>
          <h2>No Action</h2>
        </AdminCardHeader>
      );
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('layout', () => {
    it('should have bottom border and padding', () => {
      const { container } = render(
        <AdminCardHeader>Content</AdminCardHeader>
      );
      const header = container.firstChild;
      expect(header).toHaveClass('border-b');
      expect(header).toHaveClass('pb-4');
      expect(header).toHaveClass('mb-4');
    });

    it('should arrange children and action horizontally', () => {
      const { container } = render(
        <AdminCardHeader action={<button>Action</button>}>
          <h2>Title</h2>
        </AdminCardHeader>
      );
      const header = container.firstChild;
      expect(header).toHaveClass('flex');
      expect(header).toHaveClass('justify-between');
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <AdminCardHeader className="custom-header">Header</AdminCardHeader>
      );
      expect(container.firstChild).toHaveClass('custom-header');
    });
  });
});

describe('AdminCardTitle', () => {
  describe('rendering', () => {
    it('should render title text', () => {
      render(<AdminCardTitle>My Title</AdminCardTitle>);
      expect(screen.getByText('My Title')).toBeInTheDocument();
    });

    it('should render subtitle', () => {
      render(<AdminCardTitle subtitle="Subtitle text">Title</AdminCardTitle>);
      expect(screen.getByText('Subtitle text')).toBeInTheDocument();
    });

    it('should render without subtitle', () => {
      render(<AdminCardTitle>Title Only</AdminCardTitle>);
      // Should not throw
      expect(screen.getByText('Title Only')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should style title as heading', () => {
      render(<AdminCardTitle>Title</AdminCardTitle>);
      const title = screen.getByText('Title');
      expect(title.className).toContain('text-lg');
      expect(title.className).toContain('font-semibold');
    });

    it('should style subtitle appropriately', () => {
      render(<AdminCardTitle subtitle="Sub">Title</AdminCardTitle>);
      const subtitle = screen.getByText('Sub');
      expect(subtitle.className).toContain('text-sm');
      expect(subtitle.className).toContain('text-charcoal/50');
    });
  });

  describe('custom className', () => {
    it('should apply custom className to wrapper', () => {
      const { container } = render(
        <AdminCardTitle className="custom-title">Title</AdminCardTitle>
      );
      expect(container.firstChild).toHaveClass('custom-title');
    });
  });
});

describe('AdminCardBody', () => {
  describe('rendering', () => {
    it('should render children', () => {
      render(
        <AdminCardBody>
          <p>Body content</p>
        </AdminCardBody>
      );
      expect(screen.getByText('Body content')).toBeInTheDocument();
    });

    it('should render as div', () => {
      const { container } = render(
        <AdminCardBody>Content</AdminCardBody>
      );
      expect(container.querySelector('div')).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <AdminCardBody className="custom-body">Body</AdminCardBody>
      );
      expect(container.firstChild).toHaveClass('custom-body');
    });
  });
});

describe('AdminCardFooter', () => {
  describe('rendering', () => {
    it('should render children', () => {
      render(
        <AdminCardFooter>
          <button>Save</button>
          <button>Cancel</button>
        </AdminCardFooter>
      );
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('layout', () => {
    it('should have top border and padding', () => {
      const { container } = render(
        <AdminCardFooter>Content</AdminCardFooter>
      );
      const footer = container.firstChild;
      expect(footer).toHaveClass('border-t');
      expect(footer).toHaveClass('pt-4');
      expect(footer).toHaveClass('mt-4');
    });

    it('should align items to the right', () => {
      const { container } = render(
        <AdminCardFooter>
          <button>Button</button>
        </AdminCardFooter>
      );
      const footer = container.firstChild;
      expect(footer).toHaveClass('flex');
      expect(footer).toHaveClass('justify-end');
    });

    it('should have gap between items', () => {
      const { container } = render(
        <AdminCardFooter>
          <button>Cancel</button>
          <button>Save</button>
        </AdminCardFooter>
      );
      const footer = container.firstChild;
      expect(footer).toHaveClass('gap-3');
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <AdminCardFooter className="custom-footer">Footer</AdminCardFooter>
      );
      expect(container.firstChild).toHaveClass('custom-footer');
    });
  });
});

describe('Card composition', () => {
  it('should work together as a complete card', () => {
    render(
      <AdminCard>
        <AdminCardHeader action={<button>Edit</button>}>
          <AdminCardTitle subtitle="Card subtitle">Card Title</AdminCardTitle>
        </AdminCardHeader>
        <AdminCardBody>
          <p>This is the card body content</p>
        </AdminCardBody>
        <AdminCardFooter>
          <button>Cancel</button>
          <button>Save</button>
        </AdminCardFooter>
      </AdminCard>
    );

    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card subtitle')).toBeInTheDocument();
    expect(screen.getByText('This is the card body content')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });
});
