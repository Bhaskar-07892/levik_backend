import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

/** Body for every consequential action that must record why it was taken. */
export class ReasonRequestDto {
  @ApiProperty({ minLength: 5, maxLength: 500, example: 'Serial already credited on SCN-5003' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(5, { message: 'A reason of at least 5 characters is required.' })
  @MaxLength(500)
  reason: string;
}
