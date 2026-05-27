import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import emailjs from '@emailjs/browser';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class ContactComponent {
  isSending = false;
  emailSentSuccess = false;
  emailSentError = false;

  formData = {
    name: '',
    phone: '',
    email: '',
    message: '',
    privacyAccepted: false
  };

  sendEmail(event: Event, contactForm: NgForm) {
    event.preventDefault();
    console.log('Formulario: Iniciando envío con nuevo servicio Gmail...');
    this.isSending = true;
    this.emailSentSuccess = false;
    this.emailSentError = false;

    const formElement = event.target as HTMLFormElement;

    emailjs.sendForm(
      'service_pjnea6l',
      'template_s3uhxmt',
      formElement,
      'tjptuMbl0rhyI7s52'
    )
    .then((response) => {
      console.log('EmailJS Éxito:', response.status, response.text);
      this.isSending = false;
      this.emailSentSuccess = true;
      
      // Reset form controls and validation state
      contactForm.resetForm({
        privacyAccepted: false
      });
      
      // Reset the local component model
      this.formData = {
        name: '',
        phone: '',
        email: '',
        message: '',
        privacyAccepted: false
      };
    })
    .catch((error) => {
      console.error('EmailJS Error Crítico:', error);
      this.isSending = false;
      this.emailSentError = true;
    });
  }
}
