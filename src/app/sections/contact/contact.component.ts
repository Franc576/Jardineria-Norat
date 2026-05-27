import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class ContactComponent {
  formData = {
    name: '',
    phone: '',
    email: '',
    message: '',
    privacyAccepted: false
  };

  onSubmit() {
    if (this.formData.privacyAccepted) {
      console.log('Form submitted successfully:', this.formData);
      alert('¡Gracias por contactar con nosotros! Te responderemos lo antes posible.');
      // Reset Form
      this.formData = {
        name: '',
        phone: '',
        email: '',
        message: '',
        privacyAccepted: false
      };
    }
  }
}
