import webpush from 'npm:web-push@3.6.7';
import {createCalendarReminderSender} from './handler.ts';
Deno.serve(createCalendarReminderSender({url:Deno.env.get('SUPABASE_URL')??'',key:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'',send:async(subscription,payload,publicKey,privateKey)=>{await webpush.sendNotification(subscription,payload,{vapidDetails:{subject:'https://agnesgeller.github.io/erp/',publicKey,privateKey},TTL:1800,urgency:'high',timeout:8000});}}));
