import cv2
import numpy as np

fps = 30
duration = 20
width, height = 1080, 1920
frames = duration * fps

colors = [
    (0, 0, 255),    # Red (BGR em OpenCV: Blue, Green, Red) -> então (0,0,255) é vermelho
    (0, 255, 0),    # Verde
    (255, 0, 0),    # Azul
    (0, 255, 255),  # Amarelo (BGR: 0, 255, 255 = Green+Red)
    (255, 0, 255),  # Magenta (BGR: 255, 0, 255 = Blue+Red)
    (255, 255, 0)   # Cyan (BGR: 255, 255, 0 = Blue+Green)
]

for screen_id in range(1, 7):
    print(f"Gerando video da TELA {screen_id}...")
    out = cv2.VideoWriter(f"videos/screen_{screen_id}.mp4", cv2.VideoWriter_fourcc(*'mp4v'), fps, (width, height))
    bg_color = colors[screen_id - 1]
    
    for f in range(frames):
        img = np.zeros((height, width, 3), dtype=np.uint8)
        img[:] = bg_color
        
        # Piscar a tela de branco a cada segundo (nos primeiros 6 frames de cada 30 frames)
        if f % fps < 6:
            img[:] = (255, 255, 255) # Flash Branco
            
        # Desenhar ID da tela gigante
        font = cv2.FONT_HERSHEY_SIMPLEX
        text_id = f"TELA {screen_id}"
        # Sombra
        cv2.putText(img, text_id, (width//2 - 350, height//2 - 300), font, 7, (0, 0, 0), 30, cv2.LINE_AA)
        # Texto
        cv2.putText(img, text_id, (width//2 - 350, height//2 - 300), font, 7, (255, 255, 255), 10, cv2.LINE_AA)
        
        # Desenhar Timecode
        secs = f // fps
        millis = int((f % fps) * (1000/fps))
        timecode = f"00:00:{secs:02d}.{millis:03d}"
        cv2.putText(img, timecode, (width//2 - 400, height//2 + 300), font, 4, (0, 0, 0), 20, cv2.LINE_AA)
        cv2.putText(img, timecode, (width//2 - 400, height//2 + 300), font, 4, (255, 255, 255), 8, cv2.LINE_AA)
        
        out.write(img)
    out.release()
print("Finalizado!")
