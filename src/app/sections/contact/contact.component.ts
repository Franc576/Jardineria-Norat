import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import emailjs from '@emailjs/browser';
import { environment } from '../../../environments/environment';
import { ScrollPlantsComponent } from '../../components/scroll-plants/scroll-plants.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [FormsModule, RouterLink, ScrollPlantsComponent, TranslateModule],
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
    privacyAccepted: false,
    botAddress: ''
  };

  sendEmail(event: Event, contactForm: NgForm) {
    event.preventDefault();
    console.log('Formulario: Iniciando envío con nuevo servicio Gmail...');
    this.isSending = true;
    this.emailSentSuccess = false;
    this.emailSentError = false;

    // Honeypot: Si el campo oculto botAddress tiene contenido, es un bot
    if (this.formData.botAddress) {
      console.warn('Bot detectado mediante Honeypot. Abortando envío real.');
      
      // Simulamos un comportamiento de éxito para engañar al bot sin enviar correos ni gastar cuota de EmailJS
      setTimeout(() => {
        this.isSending = false;
        this.emailSentSuccess = true;
        
        contactForm.resetForm({
          privacyAccepted: false
        });
        
        this.formData = {
          name: '',
          phone: '',
          email: '',
          message: '',
          privacyAccepted: false,
          botAddress: ''
        };
      }, 1000);
      return;
    }

    const formElement = event.target as HTMLFormElement;

    // Invocación a EmailJS utilizando variables de configuración de entorno.
    // Para entornos productivos como Vercel, estas variables pueden ser administradas en el
    // dashboard del proyecto (Project Settings -> Environment Variables) y procesadas en la
    // compilación para mayor seguridad y modularidad.
    emailjs.sendForm(
      environment.emailjsServiceId,
      environment.emailjsTemplateId,
      formElement,
      environment.emailjsPublicKey
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
        privacyAccepted: false,
        botAddress: ''
      };
    })
    .catch((error) => {
      console.error('EmailJS Error Crítico:', error);
      this.isSending = false;
      this.emailSentError = true;
    });
  }
}
