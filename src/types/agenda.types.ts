export type AppointmentType = 'control' | 'urgencia' | 'vacunacion' | 'primera_vez';

export type WaitingRoomStage =
  | 'programado'
  | 'en_sala'
  | 'en_triaje'
  | 'en_consulta'
  | 'completado';
