import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminTextarea } from './AdminTextarea';

describe('AdminTextarea', () => {
  describe('rendering', () => {
    it('should render textarea with label', () => {
      render(<AdminTextarea label="Description" />);
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });

    it('should render textarea with placeholder', () => {
      render(<AdminTextarea placeholder="Enter description..." />);
      expect(screen.getByPlaceholderText('Enter description...')).toBeInTheDocument();
    });

    it('should render without label', () => {
      render(<AdminTextarea placeholder="No label" />);
      const textarea = screen.getByPlaceholderText('No label');
      expect(textarea).toBeInTheDocument();
      expect(screen.queryByRole('label')).not.toBeInTheDocument();
    });

    it('should generate unique ID when not provided', () => {
      const { container } = render(<AdminTextarea label="Field 1" />);
      const textarea1 = container.querySelector('textarea');
      
      const { container: container2 } = render(<AdminTextarea label="Field 2" />);
      const textarea2 = container2.querySelector('textarea');
      
      expect(textarea1?.id).toBeDefined();
      expect(textarea2?.id).toBeDefined();
      expect(textarea1?.id).not.toBe(textarea2?.id);
    });

    it('should use provided ID', () => {
      render(<AdminTextarea id="custom-id" label="Custom" />);
      expect(screen.getByLabelText('Custom')).toHaveAttribute('id', 'custom-id');
    });
  });

  describe('value updates', () => {
    it('should update value on input', async () => {
      const user = userEvent.setup();
      render(<AdminTextarea placeholder="Type here" />);
      
      const textarea = screen.getByPlaceholderText('Type here');
      await user.type(textarea, 'Hello world');
      
      expect(textarea).toHaveValue('Hello world');
    });

    it('should display initial value', () => {
      render(<AdminTextarea value="Initial value" readOnly />);
      expect(screen.getByDisplayValue('Initial value')).toBeInTheDocument();
    });

    it('should call onChange when typing', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      
      render(<AdminTextarea onChange={onChange} placeholder="Type" />);
      
      const textarea = screen.getByPlaceholderText('Type');
      await user.type(textarea, 'a');
      
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('character count', () => {
    it('should show character count when showCount is true', () => {
      render(<AdminTextarea value="Hello" maxLength={100} showCount readOnly />);
      expect(screen.getByText('5/100')).toBeInTheDocument();
    });

    it('should not show count when showCount is false', () => {
      render(<AdminTextarea value="Hello" maxLength={100} showCount={false} readOnly />);
      expect(screen.queryByText(/\/100/)).not.toBeInTheDocument();
    });

    it('should apply warning color when near max length', () => {
      const repeatedX = 'x'.repeat(95);
      render(<AdminTextarea value={repeatedX} maxLength={100} showCount readOnly />);
      const countElement = screen.getByText('95/100');
      expect(countElement.className).toContain('text-red');
    });

    it('should enforce maxLength constraint', async () => {
      const user = userEvent.setup();
      render(<AdminTextarea maxLength={5} placeholder="Limited" />);
      
      const textarea = screen.getByPlaceholderText('Limited') as HTMLTextAreaElement;
      await user.type(textarea, 'HelloWorld');
      
      // Should not exceed maxLength
      expect(textarea.value.length).toBeLessThanOrEqual(5);
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<AdminTextarea disabled placeholder="Disabled" />);
      expect(screen.getByPlaceholderText('Disabled')).toBeDisabled();
    });

    it('should apply disabled styling', () => {
      render(<AdminTextarea disabled placeholder="Disabled" />);
      const textarea = screen.getByPlaceholderText('Disabled');
      expect(textarea.className).toContain('opacity-60');
      expect(textarea.className).toContain('cursor-not-allowed');
    });

    it('should not allow input when disabled', async () => {
      const user = userEvent.setup();
      render(<AdminTextarea disabled placeholder="Disabled" />);
      
      const textarea = screen.getByPlaceholderText('Disabled');
      await user.type(textarea, 'test');
      
      expect(textarea).toHaveValue('');
    });
  });

  describe('error handling', () => {
    it('should display error message', () => {
      render(<AdminTextarea error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should apply error styling', () => {
      render(<AdminTextarea error="Error" placeholder="Field" />);
      const textarea = screen.getByPlaceholderText('Field');
      expect(textarea.className).toContain('border-red');
    });

    it('should prioritize error message over helper text', () => {
      render(
        <AdminTextarea 
          error="Error message" 
          helperText="Helper text"
        />
      );
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
    });
  });

  describe('helper text', () => {
    it('should display helper text', () => {
      render(<AdminTextarea helperText="Enter your bio" />);
      expect(screen.getByText('Enter your bio')).toBeInTheDocument();
    });

    it('should style helper text appropriately', () => {
      render(<AdminTextarea helperText="Helper" />);
      const helper = screen.getByText('Helper');
      expect(helper.className).toContain('text-charcoal/50');
    });
  });

  describe('required field', () => {
    it('should show asterisk when required', () => {
      render(<AdminTextarea label="Required Field" required />);
      const label = screen.getByText('Required Field');
      // The asterisk is added via CSS ::after content
      expect(label.className).toContain('after:content-');
    });

    it('should not show asterisk when not required', () => {
      render(<AdminTextarea label="Optional Field" required={false} />);
      const label = screen.getByText('Optional Field');
      expect(label.className).not.toContain('after:content-');
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(<AdminTextarea className="custom-class" placeholder="Custom" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('custom-class');
    });
  });

  describe('HTML attributes', () => {
    it('should pass through HTML attributes', () => {
      render(
        <AdminTextarea 
          rows={10}
          cols={50}
          placeholder="Textarea"
          aria-label="Description"
        />
      );
      const textarea = screen.getByPlaceholderText('Textarea');
      expect(textarea).toHaveAttribute('rows', '10');
      expect(textarea).toHaveAttribute('cols', '50');
      expect(textarea).toHaveAttribute('aria-label', 'Description');
    });
  });

  describe('ref forwarding', () => {
    it('should forward ref to textarea element', () => {
      const ref = { current: null };
      render(<AdminTextarea ref={ref as any} />);
      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
    });
  });
});
