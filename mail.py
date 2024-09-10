# Import external modules
import logging
from google.appengine.api import mail
# Import local modules
from configuration import const as conf
import httpServer
import secrets
from text import LogMessage


ADMIN_ADDRESS = 'contact@converj.net'


def sendEmailToAdminSafe( messageContent, subject='Message from website' ):
    try:
        sendEmailToAdmin( messageContent, subject=subject )
    except Exception as e:
        logging.error( f'Exception={e}' )

def sendEmailToAdmin( messageContent, subject='Message from website' ):
    logging.debug(LogMessage( 'messageContent=', messageContent ))
    mail.send_mail( sender=secrets.EMAIL_SENDER_ADDRESS, to=ADMIN_ADDRESS, subject=subject, body=messageContent )


